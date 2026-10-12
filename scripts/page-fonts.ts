#!/usr/bin/env node
/**
 * 按页字体子集：`astro build` 之后，把每个页面里引用的**全站 core** 换成本页自己的子集。
 *
 * 为什么需要这一步：全站 core 是「所有页面用到的字」的并集（≈2600 码位 / 717 KB 两字重），
 * 而单个页面只需要其中一小块（首页 311 字、中位页 213 字、最长文章 517 字）——
 * 实测首访字体字节：首页 743 KB → 170 KB、/tags 45 KB、全站中位 140 KB。
 * 按频次把 core 切成多片并不管用：页面字符是语料的**横向采样**，切完每页仍会碰到绝大多数片
 * （实测 40 KB/片时首页仍要 564 KB / 7 个请求），只有「按页精确切」才拿得到这份收益。
 *
 * 它用的还是那两个共用件——`planFacesFor(charset, …)`（字符集 → 面）与
 * `writeFaces(faces, …)`（面 → 产物文件）；本文件只负责**决定每页的字符集**：
 * - 普通页：该页真正渲染出来的字符（HTML 文本 + 样式表 content: 字面 + 私密文章源码）；
 * - `DYNAMIC_PAGES`（词汇宽、构建期看不见正文的页，如搜索结果页）：退化成**站点字面**，
 *   于是它就是 core 那份面本身，换装自然成了空操作——同一个机制的不同入参，不是另一套机制。
 *
 * 换装方式（见 `scripts/lib/font-page-swap.ts`）：只改页面里那两处引用——
 * preload 的 href、内联 `@font-face` 的 src 与 unicode-range。**不碰** Astro 渲染层，
 * 也不碰 tail 清单，因此 `npm run dev` 行为不变（没有这一步，用全站 core）；
 * unicode-range 收窄到本页字符集之后，页面里没进子集的字（样式表生成、密文解密后出现）
 * 会回落到度量对齐的 fallback，而不是画成豆腐块。
 *
 * 挂点：`npm run build` 里 `astro build` 之后、`build-deploy-config` 与 pagefind 之前
 * （产物目录此时已定稿，只差这一步换装）。产物写在 `dist/fonts/`，与 tail 同在 `/fonts/*`
 * 的 immutable 缓存规则下；文件名带内容哈希，字符集相同的页面自动共用一个文件。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { FONT_WEIGHTS, siteFaceCharset, sortChars, toUnicodeRange } from "./lib/font-charsets.ts";
import { openBlobStore, type BlobStore } from "./lib/font-blobs.ts";
import { writeFaces } from "./lib/font-faces.ts";
import { swapFaceRefs, type FaceSwap } from "./lib/font-page-swap.ts";
import { planFacesFor } from "./lib/font-plan.ts";
import { cssContentChars, pageText } from "./lib/page-text.ts";
import { readCmapSync } from "./lib/sfnt.ts";

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, "dist");
/** 页面字体产物与 tail 同居 `/fonts/*`（immutable 长缓存规则覆盖它） */
const DIST_FONT_DIR = join(DIST_DIR, "fonts");
/** 构建期生成的全站 core（`npm run fonts` 的产物），从这里认要替换掉的文件名 */
const GENERATED_FONT_DIR = join(ROOT, "public/fonts");
const SOURCE_FONT_DIR = join(ROOT, "assets/fonts");
const CONTENT_DIR = join(ROOT, "src/content/blog");
const CACHE_DIR = join(ROOT, ".cache/fonts");
const BLOB_DIR = join(CACHE_DIR, "blobs");
const BLOB_INDEX = join(CACHE_DIR, "faces.json");
/** 全站 core 的产物名（`maple-<字重>-core.<hash>.woff2`） */
const CORE_NAME = /^maple-(\d+)-core\.[0-9a-f]+\.woff2$/;
/** 按页子集的 kind（进文件名，也是 blob 缓存键的一部分） */
const PAGE_KIND = "page";
/** core 的 kind：宽词汇页退化成站点字面时用它，于是直接命中 build-fonts 已经切好的那份面 */
const CORE_KIND = "core";
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
  /** 全站 core 的产物名：字重标签 → 文件名（换装时要把它们换掉） */
  readonly cores: ReadonlyMap<string, string>;
  readonly cmaps: ReadonlyMap<string, ReadonlySet<number>>;
  /** 站点字面（`siteFaceCharset`，与 build-fonts 的 core 同一份入参） */
  readonly siteCharset: string;
  /** 页面 HTML 里看不到、却会被渲染出来的字（CSS `content:` 的字面文本） */
  readonly extras: string;
  /** 私密文章源码的字：只并进渲染它们的页面，不进其他页 */
  readonly privateChars: string;
  readonly privatePages: ReadonlySet<string>;
  readonly store: BlobStore;
}

/** 一页的入参：用哪个字符集、它算哪一种面 */
interface PageCharset {
  readonly charset: string;
  readonly kind: string;
}

interface PageResult {
  readonly page: string;
  readonly status: "swapped" | "core" | "skipped";
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
    siteCharset: siteFaceCharset(ROOT),
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

/** 待换装的页面：dist 下的 HTML，Pagefind 产物除外 */
function listPages(): string[] {
  return walk(DIST_DIR)
    .filter((file) => file.endsWith(".html"))
    .map((file) => relative(DIST_DIR, file).split("\\").join("/"))
    .filter((page) => !page.split("/").some((segment) => SKIP_DIRS.has(segment)))
    .sort();
}

/**
 * 这一页该切哪个字符集：渲染出来的字；宽词汇页退化成站点字面（于是它就是 core 那份面，
 * 换装变成空操作）。`siteFaceCharset` 与 `npm run fonts` 用的是同一个函数、同一个 ROOT，
 * 所以两边的字符集必然一致，宽词汇页直接命中已经切好的 core 产物、不会多出一份重复文件。
 */
function charsetFor(page: string, html: string, ctx: Ctx): PageCharset {
  if (DYNAMIC_PAGES.includes(page)) return { charset: ctx.siteCharset, kind: CORE_KIND };
  const secret = ctx.privatePages.has(page) ? ctx.privateChars : "";
  return { charset: sortChars(pageText(html) + ctx.extras + secret), kind: PAGE_KIND };
}

async function processPage(page: string, ctx: Ctx): Promise<PageResult> {
  const path = join(DIST_DIR, page);
  const html = readFileSync(path, "utf8");
  const { charset, kind } = charsetFor(page, html, ctx);
  const { swaps, bytes } = await buildSwaps(charset, kind, ctx);
  if (swaps.length === 0) return { page, status: "skipped", bytes: 0 };

  writeFileSync(path, swapFaceRefs(html, swaps));
  return { page, status: kind === CORE_KIND ? "core" : "swapped", bytes };
}

/** 本页每个字重各切一份子集（走共用件），并拼出换装清单 */
async function buildSwaps(charset: string, kind: string, ctx: Ctx): Promise<{ swaps: FaceSwap[]; bytes: number }> {
  const written = await writeFaces(planFacesFor(charset, ctx.cmaps, { kind }), ctx.store, DIST_FONT_DIR);
  const swaps: FaceSwap[] = [];

  for (const item of written) {
    const oldName = ctx.cores.get(item.face.label);
    if (!oldName) continue;
    swaps.push({
      oldName,
      newName: item.name,
      unicodeRange: toUnicodeRange([...item.face.chars].map((char) => char.codePointAt(0) ?? 0)),
    });
  }
  return { swaps, bytes: written.reduce((sum, item) => sum + item.bytes, 0) };
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
  const core = results.filter((item) => item.status === "core");
  const detail = core.map((item) => `${item.page}（${Math.round(item.bytes / 1024)} KB）`).join(", ");
  console.log(
    `[page-fonts] ${swapped.length} 页换成本页子集：两字重合计 中位 ${Math.round(median / 1024)} KB / ` +
      `最大 ${Math.round((bytes[bytes.length - 1] ?? 0) / 1024)} KB` +
      `${core.length > 0 ? `；用全站 core：${detail}` : ""}`,
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
