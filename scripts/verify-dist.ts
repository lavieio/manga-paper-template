#!/usr/bin/env node
/**
 * 构建产物断言（spec 的 seam #1）：构建后运行，验证 dist/ 的公开承诺。
 * 只断言外部可观察行为：私密/草稿不外泄、索引覆盖正确、关键产物存在。
 *
 * 用法：npm run build && npm run verify
 */
import { existsSync, readFileSync } from "node:fs";
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
  for (const post of hidden) {
    const sitemap = read(join(DIST, "sitemap-0.xml"));
    const rss = read(join(DIST, "rss.xml"));
    check(`sitemap 无 ${post.slug}`, !sitemap.includes(post.slug));
    check(`RSS 无 ${post.slug}`, !rss.includes(post.slug) && (!post.title || !rss.includes(post.title)));
    for (const listFile of PUBLIC_LIST_FILES) {
      const html = read(listFile);
      check(`${listFile} 无 ${post.slug}`, !html.includes(post.slug) && !html.includes(`/posts/${post.slug}`));
    }
  }

  // ⑤ Pagefind 页数 = 公开文章数（总数 - 私密/草稿数）
  const entry = read(join(DIST, "pagefind/pagefind-entry.json"));
  if (entry) {
    const actual = JSON.parse(entry).languages?.["zh-cn"]?.page_count;
    check(`Pagefind 页数 = 公开文章数 (${publicCount})`, actual === publicCount, `实际 ${actual}`);
  }

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
