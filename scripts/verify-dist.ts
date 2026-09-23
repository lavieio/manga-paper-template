#!/usr/bin/env node
/**
 * 构建产物断言（spec 的 seam #1）：构建后运行，验证 dist/ 的公开承诺。
 * 只断言外部可观察行为：私密/草稿不外泄、索引覆盖正确、关键产物存在。
 *
 * 用法：npm run build && npm run verify
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { collectHiddenPosts, countAllPosts } from "../src/plugins/private-slugs.ts";

const DIST = "dist";
const failures: string[] = [];
const passes: string[] = [];

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) passes.push(name);
  else failures.push(detail ? `${name} — ${detail}` : name);
}

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** 列表/首页/摘要类页面（私密文章不应出现） */
const PUBLIC_LIST_FILES = [
  join(DIST, "index.html"),
  join(DIST, "posts/index.html"),
  join(DIST, "archive/index.html"),
  join(DIST, "tags/index.html"),
];

type HiddenPost = ReturnType<typeof collectHiddenPosts>[number];

/** ⑤ Pagefind 页数 = 公开文章数（总数 - 私密/草稿数） */
function checkPagefindCount(publicCount: number): void {
  const entry = read(join(DIST, "pagefind/pagefind-entry.json"));
  if (!entry) return;
  const actual = JSON.parse(entry).languages?.["zh-cn"]?.page_count;
  check(`Pagefind 页数 = 公开文章数 (${publicCount})`, actual === publicCount, `实际 ${actual}`);
}

/** ④ 私密/草稿不得出现在 sitemap / RSS / 公开列表 */
function checkHiddenNotPublished(hidden: HiddenPost[]): void {
  const sitemap = read(join(DIST, "sitemap-0.xml"));
  const rss = read(join(DIST, "rss.xml"));
  for (const post of hidden) {
    check(`sitemap 无 ${post.slug}`, !sitemap.includes(post.slug));
    check(`RSS 无 ${post.slug}`, !rss.includes(post.slug) && (!post.title || !rss.includes(post.title)));
    for (const listFile of PUBLIC_LIST_FILES) {
      const html = read(listFile);
      check(`${listFile} 无 ${post.slug}`, !html.includes(post.slug) && !html.includes(`/posts/${post.slug}`));
    }
  }
}

/**
 * /_astro 下的哈希资源引用：HTML 里写作 /_astro/x，JS chunk 的 __vite__mapDeps 里写作 _astro/x。
 */
const ASSET_REF = /_astro\/[A-Za-z0-9._-]+\.(?:js|css)/g;

/** 可能带资源引用的产物：页面 + 打包脚本 */
function refCandidateFiles(): string[] {
  return readdirSync(DIST, { recursive: true })
    .map(String)
    .map((p) => p.replace(/\\/g, "/"))
    .filter((p) => p.endsWith(".html") || p.startsWith("_astro/"));
}

/**
 * ⑥ 产物引用的 /_astro 资源必须真实存在。
 * inlineStylesheets 会把 CSS 内联进 <style> 并删掉产物文件；此时只要有代码在运行时动态 import
 * 这些 CSS，浏览器就拿 404 → 整个动态 import 链 reject → 功能静默失效（正文灯箱曾因此点不开图）。
 * 把「引用了就必须在」卡在构建期，这类失效模式不必等线上才发现。
 */
function checkAssetRefs(): void {
  const refs = new Map<string, string>();
  for (const file of refCandidateFiles()) {
    for (const ref of read(join(DIST, file)).match(ASSET_REF) ?? []) {
      if (!refs.has(ref)) refs.set(ref, file);
    }
  }

  const missing = [...refs].filter(([ref]) => !existsSync(join(DIST, ref)));
  check(
    "产物引用的 /_astro 资源全部存在",
    refs.size > 0 && missing.length === 0,
    missing.length > 0
      ? missing.map(([ref, from]) => `${ref}（引用于 ${from}）`).join(" / ")
      : "未扫描到任何引用，断言会退化成空转",
  );
}

function main(): void {
  // ① 基础产物
  check("dist/index.html 存在", existsSync(join(DIST, "index.html")));

  const hidden = collectHiddenPosts();
  const privates = hidden.filter((p) => p.isPrivate);
  const drafts = hidden.filter((p) => p.isDraft);
  const publicCount = countAllPosts() - hidden.length;

  // Pagefind 仅在存在可索引页面（公开文章）时产出索引
  check(
    "Pagefind 索引存在",
    publicCount === 0 || existsSync(join(DIST, "pagefind/pagefind.js")),
    `公开文章数 ${publicCount}`,
  );
  check("RSS 存在", existsSync(join(DIST, "rss.xml")));

  // ② 私密文章：页面存在但零明文、noindex、含密文 payload
  for (const post of privates) {
    const file = join(DIST, "posts", post.slug, "index.html");
    const html = read(file);
    check(`私密文章页面存在：${post.slug}`, html.length > 0);
    const leaked = [post.title, post.description].filter((t) => t && html.includes(t));
    check(`私密文章零明文：${post.slug}`, leaked.length === 0, `泄漏：${leaked.join(" / ")}`);
    check(`私密文章 noindex：${post.slug}`, html.includes('content="noindex"'));
    check(`私密文章密文 payload：${post.slug}`, html.includes('id="private-payload"'));
  }

  // ③ 草稿：不应有任何页面产物
  for (const post of drafts) {
    check(`草稿无产物：${post.slug}`, !existsSync(join(DIST, "posts", post.slug)));
  }

  // ④ 私密/草稿不得出现在 sitemap / RSS / 公开列表
  checkHiddenNotPublished(hidden);

  // ⑤ Pagefind 页数 = 公开文章数（总数 - 私密/草稿数）
  checkPagefindCount(publicCount);

  // ⑥ 产物引用的资源都存在（灯箱动态 CSS 曾整片 404）
  checkAssetRefs();

  // 输出
  console.log(`\n✅ 通过 ${passes.length} 项`);
  if (failures.length > 0) {
    console.error(`\n❌ 失败 ${failures.length} 项：`);
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log("产物断言全部通过。\n");
}

main();
