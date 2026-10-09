#!/usr/bin/env node
/**
 * 按页字体子集：`astro build` 之后，把每个页面里引用的**全站 core** 换成本页自己的子集。
 *
 * 为什么需要这一步：全站 core 是「所有页面用到的字」的并集（≈2600 码位 / 717 KB 两字重），
 * 而单个页面只需要其中一小块（首页 311 字、中位页 213 字、最长文章 517 字）——
 * 实测首访字体字节：首页 743 KB → 125 KB、/tags 21 KB、全站平均 ~97 KB。
 * 按频次把 core 切成多片并不管用：页面字符是语料的**横向采样**，切完每页仍会碰到绝大多数片
 * （实测 40 KB/片时首页仍要 564 KB / 7 个请求），只有「按页精确切」才拿得到这份收益。
 *
 * 换装方式（见 `scripts/lib/font-page-swap.ts`）：只改页面里那两处引用——
 * preload 的 href、内联 `@font-face` 的 src 与 unicode-range。**不碰** Astro 渲染层，
 * 也不碰 tail 清单，因此：
 * - `npm run dev` 行为不变（没有这一步，用全站 core）；
 * - 漏换的页面（`DYNAMIC_PAGES`）仍用全站 core，最坏是回到改造前的体积，不会没字体；
 * - unicode-range 收窄到本页字符集：页面里没进子集的字（样式表生成、密文解密后出现）
 *   会回落到度量对齐的 fallback，而不是画成豆腐块。
 *
 * 挂点：`npm run build` 里 `astro build` 之后、`build-deploy-config` 与 pagefind 之前
 * （产物目录此时已定稿，只差这一步换装）。产物写在 `dist/fonts/`，与 tail 同在 `/fonts/*`
 * 的 immutable 缓存规则下；文件名带内容哈希，字符集相同的页面自动共用一个文件。
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { FONT_WEIGHTS, faceFileName, sortChars, toUnicodeRange } from "./lib/font-charsets.ts";
import { openBlobStore, type BlobStore } from "./lib/font-blobs.ts";
import { swapFaceRefs, type FaceSwap } from "./lib/font-page-swap.ts";
import { cssContentChars, pageText } from "./lib/page-text.ts";
import { readCmapSync } from "./lib/sfnt.ts";

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, "dist");
/** 页面字体产物与 tail 同居 `/fonts/*`（immutable 长缓存规则覆盖它） */
const DIST_FONT_DIR = join(DIST_DIR, "fonts");
/** 构建期生成的全站 core（`npm run fonts` 的产物），从这里认文件名 */
const GENERATED_FONT_DIR = join(ROOT, "public/fonts");
const SOURCE_FONT_DIR = join(ROOT, "assets/fonts");
const CONTENT_DIR = join(ROOT, "src/content/blog");
const CACHE_DIR = join(ROOT, ".cache/fonts");
const BLOB_DIR = join(CACHE_DIR, "blobs");
const BLOB_INDEX = join(CACHE_DIR, "faces.json");
/** 全站 core 的产物名（`maple-<字重>-core.<hash>.woff2`） */
const CORE_NAME = /^maple-(\d+)-core\.[0-9a-f]+\.woff2$/;
const PAGE_KIND = "page";
/**
 * 内容由客户端现生成、因而保留全站 core 的页面。
 *
 * 判据是「这一面要渲染的**词汇宽度**」：
 * - 搜索页的结果是 20 条标题 + 摘要，词汇宽（实测一次搜索就把 63 个分片 ≈1.6 MB 全拉下来了），
 *   比整份 core（717 KB，且能长缓存）贵得多 → 保留 core；
 * - 反过来，只有几个不可预测的字的面（输入框里敲的词、短评论）应该走 tail 分片（一片 25 KB 上下）；
 *   目前全站没有这种面——搜索页的输入框也在保留 core 的页面上，直接用 core 即可。
 */
const DYNAMIC_PAGES: readonly string[] = ["search/index.html"];
/** 跳过 Pagefind 自己的产物目录 */
const SKIP_DIRS = new Set(["pagefind"]);
/** 私密文章：产物里是密文，解锁后要用的字形只能从源码取 */
const PRIVATE_FRONTMATTER = /^private:\s*true\s*$/m;

interface Ctx {
  readonly cores: ReadonlyMap<string, string>;
  readonly cmaps: ReadonlyMap<string, ReadonlySet<number>>;
  /** 页面 HTML 里看不到、却会被渲染出来的字（CSS `content:` 的字面文本） */
  readonly extras: string;
  /** 私密文章源码的字：只并进渲染它们的页面，不进其他页 */
  readonly privateChars: string;
  readonly privatePages: ReadonlySet<string>;
  readonly store: BlobStore;
}

interface PageResult {
  readonly page: string;
  readonly status: "swapped" | "dynamic" | "skipped";
  readonly bytes: number;
}

async function main(): Promise<void> {
  const cores = coreFaces();
  if (cores.size === 0) {
    console.log(`[page-fonts] 没有全站 core 产物（${GENERATED_FONT_DIR}），跳过——先跑 npm run fonts`);
    return;
  }
  const privateSource = privateCharset();
  const ctx: Ctx = {
    cores,
    cmaps: readCmaps(),
    extras: cssExtras(),
    privateChars: privateSource.chars,
    privatePages: privateSource.pages,
    store: openBlobStore({
      blobDir: BLOB_DIR,
      indexPath: BLOB_INDEX,
      generator: packageVersion("subset-font"),
      source: weightSource,
    }),
  };

  const results: PageResult[] = [];
  for (const page of listPages()) results.push(await processPage(page, ctx));
  ctx.store.flush();
  report(results);
}

/** 全站 core 的产物名：字重标签 → 文件名 */
function coreFaces(): Map<string, string> {
  const cores = new Map<string, string>();
  if (!existsSync(GENERATED_FONT_DIR)) return cores;
  for (const name of readdirSync(GENERATED_FONT_DIR)) {
    const label = CORE_NAME.exec(name)?.[1];
    if (label) cores.set(label, name);
  }
  return cores;
}

/** 完整字体真正提供哪些码位：unicode-range 要照它写，否则会给字体没有的字背书 */
function readCmaps(): Map<string, ReadonlySet<number>> {
  const cmaps = new Map<string, ReadonlySet<number>>();
  for (const weight of FONT_WEIGHTS) cmaps.set(weight.label, readCmapSync(join(SOURCE_FONT_DIR, weight.file)));
  return cmaps;
}

/** CSS `content:` 里生成的字（如 `content: "└ "`）：不在 HTML 里，但会渲染 */
function cssExtras(): string {
  let out = "";
  for (const file of walk(join(ROOT, "src"))) {
    const extension = file.slice(file.lastIndexOf("."));
    if (extension === ".css" || extension === ".astro") out += cssContentChars(readFileSync(file, "utf8"));
  }
  return out;
}

/** 私密文章：字符集 + 需要并上它们的页面（文章页与 /private 列表页） */
function privateCharset(): { chars: string; pages: Set<string> } {
  let chars = "";
  const pages = new Set<string>();

  for (const file of walk(CONTENT_DIR)) {
    if (!file.endsWith(".md")) continue;
    const source = readFileSync(file, "utf8");
    if (!PRIVATE_FRONTMATTER.test(source)) continue;
    chars += source;
    pages.add(`posts/${basename(file).replace(/\.md$/, "")}/index.html`);
  }
  if (pages.size > 0) pages.add("private/index.html");
  return { chars, pages };
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** 待换装的页面：dist 下的 HTML，Pagefind 产物与动态页除外 */
function listPages(): string[] {
  return walk(DIST_DIR)
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(DIST_DIR, file).split("\\").join("/"))
    .filter((page) => !page.split("/").some((segment) => SKIP_DIRS.has(segment)))
    .sort();
}

async function processPage(page: string, ctx: Ctx): Promise<PageResult> {
  const path = join(DIST_DIR, page);
  const html = readFileSync(path, "utf8");
  if (DYNAMIC_PAGES.includes(page)) return { page, status: "dynamic", bytes: 0 };
  const secret = ctx.privatePages.has(page) ? ctx.privateChars : "";
  const charset = sortChars(pageText(html) + ctx.extras + secret);
  const { swaps, bytes } = await buildSwaps(charset, ctx);
  if (swaps.length === 0) return { page, status: "skipped", bytes: 0 };

  writeFileSync(path, swapFaceRefs(html, swaps));
  return { page, status: "swapped", bytes };
}

/** 本页每个字重各切一份子集，并拼出换装清单（返回字节数 = 两字重合计） */
async function buildSwaps(charset: string, ctx: Ctx): Promise<{ swaps: FaceSwap[]; bytes: number }> {
  const swaps: FaceSwap[] = [];
  let bytes = 0;

  for (const [label, oldName] of ctx.cores) {
    const chars = supported(charset, ctx.cmaps.get(label));
    if (chars === "") continue;
    const blob = await ctx.store.ensure(label, PAGE_KIND, chars);
    const newName = faceFileName(label, PAGE_KIND, blob.hash);
    copyFileSync(join(BLOB_DIR, blob.file), join(DIST_FONT_DIR, newName));
    bytes += statSync(join(DIST_FONT_DIR, newName)).size;
    swaps.push({ oldName, newName, unicodeRange: toUnicodeRange([...chars].map((char) => char.codePointAt(0) ?? 0)) });
  }
  return { swaps, bytes };
}

/** 只留完整字体真正有的字（`✅` 这类字体没有的字进不了任何面） */
function supported(chars: string, cmap: ReadonlySet<number> | undefined): string {
  if (!cmap) return "";
  return [...chars].filter((char) => cmap.has(char.codePointAt(0) ?? 0)).join("");
}

function weightSource(label: string): Buffer {
  const weight = FONT_WEIGHTS.find((item) => item.label === label);
  if (!weight) throw new Error(`没有字重 ${label}`);
  return readFileSync(join(SOURCE_FONT_DIR, weight.file));
}

function report(results: readonly PageResult[]): void {
  const swapped = results.filter((item) => item.status === "swapped");
  const bytes = swapped.map((item) => item.bytes).sort((a, b) => a - b);
  const median = bytes[Math.floor(bytes.length / 2)] ?? 0;
  const dynamic = results.filter((item) => item.status === "dynamic").map((item) => item.page);
  console.log(
    `[page-fonts] ${swapped.length} 页换成本页子集：两字重合计 中位 ${Math.round(median / 1024)} KB / ` +
      `最大 ${Math.round((bytes[bytes.length - 1] ?? 0) / 1024)} KB` +
      `${dynamic.length > 0 ? `；保留全站 core：${dynamic.join(", ")}` : ""}`,
  );
}

function packageVersion(name: string): string {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, "node_modules", name, "package.json"), "utf8")) as { version?: string };
    return raw.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

await main().catch((error: unknown) => {
  console.error(`[page-fonts] ✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
