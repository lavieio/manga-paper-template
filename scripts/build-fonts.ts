#!/usr/bin/env node
/**
 * 字体子集：按当前内容把提交进仓的完整字体切成上线要用的子集（core）。
 *
 * 本文件只负责「**挑字符集** + 落盘」；切面与渲染都是共用件：
 * 一个字符集 → 每个字重一个面（`scripts/lib/font-plan.ts`），
 * 面 → 产物文件（`scripts/lib/font-faces.ts`），面 → `@font-face` 清单（`font-render.ts`）。
 *
 * 分两段，各管一件事（另一段在 `scripts/page-fonts.ts`，用的是同一套共用件）：
 *
 * 1. **本文件（`npm run fonts`，在 `astro build` 之前）**：切**全站 core**——
 *    字符集 = `siteFaceCharset()`（站点字符 + 常用符号），kind = `core`，preload 400/700。
 *    它是**开发期与兜底**用的：`astro dev` 没有第二段，页面就靠它；上线时每页的引用会被
 *    第二段换成本页自己的子集，漏换的页面也仍然能用；词汇宽的动态面（搜索页）也直接保留它。
 * 2. **`scripts/page-fonts.ts`（在 `astro build` 之后）**：按页把 core 的引用换成
 *    「这一页真正出现的字符」的子集——单个页面只需要全站字符的 1/4 上下，
 *    首访字体字节因此从 ~720 KB 降到 ~140 KB。
 *
 * 站点字符集**之外**的字（用户现敲的生僻字、评论里的字）不自托管：交给 `src/styles/fonts.css`
 * 里那两份**度量对齐**的 fallback（Consolas 系与系统 CJK）——推进宽度与行盒都对齐 MapleMono，
 * 换字体不推动内容（CLS 实测 0.052 → 0.010），代价只是字形随平台。
 *
 * - **输入**：`assets/fonts/` 里的上游完整 TTF（OFL-1.1，随仓库提交），要切哪些字重见 `FONT_WEIGHTS`；
 * - **产物**：`public/fonts/*.woff2` + `src/styles/fonts-core.css` + `public/maple-core.css`
 *   （core 清单的稳定地址，给跨源消费者）+ `src/utils/font/assets.ts`，都在 .gitignore 里、**不进仓**；
 * - **跳过**：字符集与输入字体都没变就整个跳过（指纹见 `.cache/fonts/plan.json`），
 *   本机后续构建 ~0.1s；干净 clone 第一次 ≈1–2s（2 个 core 面）。
 *   注意「不变」指的是**产物**不变：字体没有的字（✅❌➕）进不了任何面，它们增减不会触发重切；
 *   缺字报告 `.cache/fonts/coverage.json` 则每次运行都重写（它是观测值，不是产物）。
 *
 * 为什么不留一份「预切好的中间字体」提交进仓：那要多维护一层字符集与一次重建步骤，
 * 而 subset 的耗时由**产物**大小决定，输入是完整字体（20 MB）还是中间子集（1.7 MB）实测几乎一样。
 * 仓库里放上游原文件换来两件事：sha256 可核、升级字体就是换个文件。
 *
 * 挂点：`npm run fonts`，由 `npm run build` 与 `npm run dev` 自动调用。
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FONT_WEIGHTS, PRELOAD_LABELS, siteCharset, siteFaceCharset } from "./lib/font-charsets.ts";
import { openBlobStore, type BlobStore } from "./lib/font-blobs.ts";
import { writeFaces, type WrittenFace } from "./lib/font-faces.ts";
import { missingChars, planFacesFor, type FacePlan, type FontCmaps } from "./lib/font-plan.ts";
import { CORE_FACE_CSS_HEADER, FONT_DIR_README, renderFaceCss, renderFontAssets } from "./lib/font-render.ts";
import { readCodepoints } from "./lib/sfnt.ts";

const ROOT = process.cwd();
const FONT_SOURCE_DIR = join(ROOT, "assets/fonts");
const OUT_DIR = join(ROOT, "public/fonts");
const CACHE_DIR = join(ROOT, ".cache/fonts");
const BLOB_DIR = join(CACHE_DIR, "blobs");
const BLOB_INDEX = join(CACHE_DIR, "faces.json");
const PLAN_FILE = join(CACHE_DIR, "plan.json");
const COVERAGE_FILE = join(CACHE_DIR, "coverage.json");
/** core 字面清单：跟随页面 CSS 一起内联（~18 KB，换掉一次渲染阻塞 RTT 划算） */
const CORE_FACE_CSS = join(ROOT, "src/styles/fonts-core.css");
/**
 * 全站 core 清单的**稳定地址**（`/maple-core.css`，不在 `/fonts/*` 下，走平台默认缓存）：
 * 跨源消费者（remark42 的评论区 iframe）要把它 `@import` 进主题 CSS，而哈希名一变
 * 那边的配置就失效了。评论区那种「词汇很宽」的面用整份 core 才划算——按需分片会被铺满。
 */
const CORE_CSS_STABLE = join(ROOT, "public/maple-core.css");
/** 旧版生成物：v1.5.0 及以前把 core + tail 写在同一个 `fonts-face.css` 里 */
const LEGACY_FACE_CSS = join(ROOT, "src/styles/fonts-face.css");
const ASSETS_TS = join(ROOT, "src/utils/font/assets.ts");
const LICENSE_NAME = "LICENSE.txt";
/** 改字符集 / 切片 / 命名规则时 +1：指纹随之失效，产物全部重切 */
const PLAN_VERSION = 6;
const HASH_LENGTH = 8;
/** 构建日志里最多列几个缺字，其余只报数量 */
const MISSING_PREVIEW = 16;

interface PlanState {
  readonly key: string;
  readonly files: readonly string[];
}

async function main(): Promise<void> {
  removeLegacyArtifacts();
  const hashes = hashFonts();
  const cmaps = await readFontCmaps();
  const { faces, missing } = planAll(cmaps);
  reportMissing(missing);
  writeCoverage(faces.length, missing);

  const key = planKey(faces, hashes);
  if (isUpToDate(key)) {
    console.log(`[fonts] 字符集没变，跳过生成（${faces.length} 个面 / ${key}）`);
    return;
  }
  const store = openStore();
  // 产物目录先清空：切法变了（比如去掉 tail）时要收走上一轮留下的文件，
  // 否则 isUpToDate 的文件数比对永远对不上，每次构建都会重切
  rmSync(OUT_DIR, { recursive: true, force: true });
  const written = await writeFaces(faces, store, OUT_DIR);
  store.flush();
  writeOutputs(written, key);
  console.log(`[fonts] 生成 ${written.length} 个面 → public/fonts（${key}）`);
}

/**
 * 挑字符集：core = 站点字面（同一个切面函数，只是入参不同）。
 *
 * 缺字报告看**站点自己的字**，不看面上那份：符号块（0x00A0–0x2BFF 那几段）是「挡住未来
 * 代码类文章」的余量，字库里没有的那几千个符号不是内容，报出来只是噪音。
 */
function planAll(cmaps: FontCmaps): { faces: FacePlan[]; missing: string } {
  const site = siteFaceCharset(ROOT);
  const faces = planFacesFor(site, cmaps, { kind: "core", preload: PRELOAD_LABELS });
  return { faces, missing: missingChars(siteCharset(ROOT), cmaps) };
}

/**
 * 清掉旧版生成物（v1.5.0 及以前唯一的那份 `fonts-face.css`）。
 * 必须**在扫站点字符之前**做：那文件里是一大堆 `unicode-range` 文本，留着会被 `siteCharset()`
 * 当成源码字符扫进去，core 子集会膨胀到覆盖整个 GB2312——一个静默的倒退。
 */
function removeLegacyArtifacts(): void {
  rmSync(LEGACY_FACE_CSS, { force: true });
}

/** 完整字体必须齐全；顺手算出内容哈希进指纹（换了字体立刻失效） */
function hashFonts(): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const weight of FONT_WEIGHTS) {
    const file = join(FONT_SOURCE_DIR, weight.file);
    if (!existsSync(file)) throw new Error(`缺完整字体 ${file}：把上游对应字重的 TTF 放进 assets/fonts/`);
    hashes.set(weight.label, sha256(readFileSync(file)));
  }
  return hashes;
}

/** 字体真正提供哪些字形：unicode-range 要照它写，不能照「请求的字符集」写 */
async function readFontCmaps(): Promise<FontCmaps> {
  const cmaps = new Map<string, Set<number>>();
  for (const weight of FONT_WEIGHTS) {
    cmaps.set(weight.label, await readCodepoints(join(FONT_SOURCE_DIR, weight.file)));
  }
  return cmaps;
}

/** 两个脚本共用同一个 blob 缓存目录：core 与按页子集互不污染也互不覆盖 */
function openStore(): BlobStore {
  return openBlobStore({
    blobDir: BLOB_DIR,
    indexPath: BLOB_INDEX,
    generator: packageVersion("subset-font"),
    source: weightSource,
  });
}

/** 完整字体字节（blob 缓存按字重标签取源） */
function weightSource(label: string): Buffer {
  const weight = FONT_WEIGHTS.find((item) => item.label === label);
  if (!weight) throw new Error(`没有字重 ${label}`);
  return readFileSync(join(FONT_SOURCE_DIR, weight.file));
}

/** 写三份文本产物：内联的 core 清单、稳定地址的 core 清单、字体资产 TS */
function writeOutputs(written: readonly WrittenFace[], key: string): void {
  const coreCss = renderFaceCss(written, CORE_FACE_CSS_HEADER);
  writeFileSync(CORE_FACE_CSS, coreCss);
  writeFileSync(CORE_CSS_STABLE, coreCss);

  const preload = written.filter((item) => item.face.preload).map((item) => `/fonts/${item.name}`);
  // ASSETS_TS 在 .gitignore 里，而且是它所在目录里**唯一**的文件——全新 clone 里那个目录
  // 根本不存在，直接写会 ENOENT（Vercel 上就是这么炸的）。产物自己负责把目录建出来。
  mkdirSync(dirname(ASSETS_TS), { recursive: true });
  writeFileSync(ASSETS_TS, renderFontAssets(preload, key));
  writeFileSync(join(OUT_DIR, "README.md"), FONT_DIR_README);
  writePlanFile(written.map((item) => item.name), key);
}

/** 许可证与指纹：OFL-1.1 要求随字体一起分发许可证；指纹供下一次构建判断能否跳过 */
function writePlanFile(names: readonly string[], key: string): void {
  const license = join(FONT_SOURCE_DIR, LICENSE_NAME);
  if (existsSync(license)) copyFileSync(license, join(OUT_DIR, LICENSE_NAME));
  else console.warn(`[fonts] ⚠ 缺 ${license}：OFL-1.1 要求随字体一起分发许可证`);

  mkdirSync(CACHE_DIR, { recursive: true });
  const files = [...names, "README.md", ...(existsSync(license) ? [LICENSE_NAME] : [])];
  writeFileSync(PLAN_FILE, `${JSON.stringify({ key, files }, null, 2)}\n`);
}

/**
 * 缺字报告：**每次运行都重写**，包括「跳过生成」那条路径。
 * 它是按当前内容现算的观测值，不是产物——只在重生时才写的话，报告会比内容旧，
 * 而下游（覆盖断言、排查用的人眼）拿到的就是过期结论。
 */
function writeCoverage(faces: number, missing: string): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(COVERAGE_FILE, `${JSON.stringify({ faces, missing: [...missing].map(hexCodepoint) }, null, 2)}\n`);
}

/** 指纹里的字符集部分：与产物一一对应，任何字符集变化都会让指纹失效 */
function planKey(faces: readonly FacePlan[], fontHashes: ReadonlyMap<string, string>): string {
  const payload = JSON.stringify({
    v: PLAN_VERSION,
    subsetFont: packageVersion("subset-font"),
    fonts: [...fontHashes.entries()].sort(),
    faces: faces.map((face) => [face.label, face.kind, face.cssWeight, face.italic, sha256(face.chars).slice(0, 12)]),
  });
  return sha256(payload).slice(0, 16);
}

/** 指纹一致 + 产物齐全（且没有多余的 woff2 残留）才算「不用重切」 */
function isUpToDate(key: string): boolean {
  if (!existsSync(PLAN_FILE) || !existsSync(CORE_FACE_CSS) || !existsSync(ASSETS_TS)) return false;
  // 稳定地址的那份 core 清单在 OUT_DIR 之外，单独核一下（删了它、但指纹没变时不能跳过）
  if (!existsSync(CORE_CSS_STABLE)) return false;

  const state = JSON.parse(readFileSync(PLAN_FILE, "utf8")) as PlanState;
  if (state.key !== key) return false;

  const present = new Set(existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []);
  const presentFaces = [...present].filter((name) => name.endsWith(".woff2"));
  const expectedFaces = state.files.filter((name) => name.endsWith(".woff2"));
  return state.files.every((name) => present.has(name)) && presentFaces.length === expectedFaces.length;
}

/** 缺字是**信息**不是错误：字库里本来就没有的字符（✅❌➕、康熙部首）只能回落 fallback */
function reportMissing(missing: string): void {
  if (missing === "") return;
  console.warn(
    `[fonts] ⚠ ${[...missing].length} 个字符完整字体里没有，回落度量对齐的 fallback：${[...missing].slice(0, MISSING_PREVIEW).join("")}`,
  );
}

function hexCodepoint(char: string): string {
  return (char.codePointAt(0) ?? 0).toString(16).toUpperCase();
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
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
  console.error(`[fonts] ✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
