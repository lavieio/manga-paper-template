#!/usr/bin/env node
/**
 * P1-1 字体：按当前内容把提交进仓的完整字体切成上线要用的子集（core + tail）。
 *
 * - **输入**：`assets/fonts/` 里 4 个完整字重的 TTF（上游原文件，OFL-1.1，随仓库提交）；
 * - **产物**：`public/fonts/*.woff2` + `src/styles/fonts-face.css` + `src/utils/font-assets.ts`，
 *   都在 .gitignore 里、**不进仓**；
 * - **跳过**：字符集与输入字体都没变就整个跳过（指纹见 `.cache/fonts/plan.json`），
 *   本机后续构建 ~0.2s；干净 clone 第一次 ≈20s（4 个 core + 80 个 tail 片）。
 *   注意「不变」指的是**产物**不变：字体没有的字（✅❌➕）进不了任何面，它们增减不会触发重切；
 *   缺字报告 `.cache/fonts/coverage.json` 则每次运行都重写（它是观测值，不是产物）。
 * - **切片**：core = 站点字符 + 常用符号（4 个字重），tail = GB2312 一级里 core 之外的剩余字
 *   按「1 个区」切片（只 400/700），交给浏览器按 unicode-range 按需取。
 *
 * 为什么不留一份「预切好的中间字体」提交进仓：那要多维护一层字符集与一次重建步骤，
 * 而 subset 的耗时由**产物**大小决定，输入是完整字体（20 MB）还是中间子集（1.7 MB）实测几乎一样。
 * 仓库里放上游原文件换来两件事：sha256 可核、升级字体就是换个文件。
 *
 * 挂点：`npm run fonts`，由 `npm run build` 与 `npm run dev` 自动调用。
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";
import { FONT_WEIGHTS, faceFileName, siteCharset } from "./lib/font-charsets.ts";
import { planFaces, type FacePlan, type FontCmaps, type FontPlan } from "./lib/font-plan.ts";
import { FONT_DIR_README, renderFaceCss, renderFontAssets } from "./lib/font-render.ts";
import { readCodepoints } from "./lib/sfnt.ts";

const ROOT = process.cwd();
const FONT_SOURCE_DIR = join(ROOT, "assets/fonts");
const OUT_DIR = join(ROOT, "public/fonts");
const CACHE_DIR = join(ROOT, ".cache/fonts");
const BLOB_DIR = join(CACHE_DIR, "blobs");
const BLOB_INDEX = join(CACHE_DIR, "faces.json");
const PLAN_FILE = join(CACHE_DIR, "plan.json");
const COVERAGE_FILE = join(CACHE_DIR, "coverage.json");
const FACE_CSS = join(ROOT, "src/styles/fonts-face.css");
const ASSETS_TS = join(ROOT, "src/utils/font-assets.ts");
const LICENSE_NAME = "LICENSE.txt";
/** 改字符集 / 切片 / 命名规则时 +1：指纹随之失效，产物全部重切 */
const PLAN_VERSION = 2;
const HASH_LENGTH = 8;
/** 构建日志里最多列几个缺字，其余只报数量 */
const MISSING_PREVIEW = 16;

interface PlanState {
  readonly key: string;
  readonly files: readonly string[];
}

async function main(): Promise<void> {
  const hashes = hashFonts();
  const plan = planFaces(siteCharset(ROOT), await readFontCmaps());
  reportMissing(plan.missing);
  writeCoverage(plan);

  const key = planKey(plan, hashes);
  if (isUpToDate(key)) {
    console.log(`[fonts] 字符集没变，跳过生成（${plan.faces.length} 个面 / ${key}）`);
    return;
  }
  const names = await writeFaces(plan.faces);
  writeOutputs(plan, names, key);
  console.log(`[fonts] 生成 ${names.length} 个面 → public/fonts（${key}）`);
}

/** 完整字体必须齐全；顺手算出内容哈希进指纹（换了字体立刻失效） */
function hashFonts(): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const weight of FONT_WEIGHTS) {
    const file = join(FONT_SOURCE_DIR, weight.file);
    if (!existsSync(file)) throw new Error(`缺完整字体 ${file}：把上游 4 个字重的 TTF 放进 assets/fonts/`);
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

function writeFaces(faces: readonly FacePlan[]): Promise<string[]> {
  mkdirSync(BLOB_DIR, { recursive: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  return renderFaces(faces);
}

/** 逐个面取 blob（命中缓存就复用）并拷进发布目录，返回产物文件名 */
async function renderFaces(faces: readonly FacePlan[]): Promise<string[]> {
  const index = loadBlobIndex();
  const names: string[] = [];

  for (const face of faces) {
    const blob = await ensureBlob(face, index);
    const name = faceFileName(face.label, face.kind, blob.hash);
    copyFileSync(join(BLOB_DIR, blob.file), join(OUT_DIR, name));
    names.push(name);
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(BLOB_INDEX, `${JSON.stringify(index, null, 2)}\n`);
  return names;
}

/** 内容寻址的 blob 缓存：字符集没变的面直接复用，加一篇文章只会重切受影响的那几个 */
async function ensureBlob(face: FacePlan, index: Record<string, string>): Promise<{ file: string; hash: string }> {
  const key = blobKey(face);
  const cached = index[key];
  if (cached && existsSync(join(BLOB_DIR, cached))) return { file: cached, hash: cached.slice(0, HASH_LENGTH) };

  const weight = FONT_WEIGHTS.find((item) => item.label === face.label);
  if (!weight) throw new Error(`没有字重 ${face.label}`);
  const source = readFileSync(join(FONT_SOURCE_DIR, weight.file));

  const subset = await subsetFont(source, face.chars, { targetFormat: "woff2" });
  const file = `${sha256(subset).slice(0, HASH_LENGTH)}.woff2`;
  writeFileSync(join(BLOB_DIR, file), subset);
  index[key] = file;
  return { file, hash: file.slice(0, HASH_LENGTH) };
}

/** 缓存键要带上 subset-font 版本：升级它等于换了切法，旧 blob 不能再复用 */
function blobKey(face: FacePlan): string {
  return sha256([packageVersion("subset-font"), face.label, face.kind, face.chars].join("\u0000")).slice(0, 16);
}

function writeOutputs(plan: FontPlan, names: readonly string[], key: string): void {
  writeFileSync(FACE_CSS, renderFaceCss(plan.faces, names));
  writeFileSync(ASSETS_TS, renderFontAssets(plan.faces, names, key));
  writeFileSync(join(OUT_DIR, "README.md"), FONT_DIR_README);

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
 * 而下游（devtools 的覆盖断言、排查用的人眼）拿到的就是过期结论。
 */
function writeCoverage(plan: FontPlan): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(
    COVERAGE_FILE,
    `${JSON.stringify({ faces: plan.faces.length, missing: [...plan.missing].map(hexCodepoint) }, null, 2)}\n`,
  );
}

/** 指纹里的字符集部分：与产物一一对应，任何字符集变化都会让指纹失效 */
function planKey(plan: FontPlan, fontHashes: ReadonlyMap<string, string>): string {
  const payload = JSON.stringify({
    v: PLAN_VERSION,
    subsetFont: packageVersion("subset-font"),
    fonts: [...fontHashes.entries()].sort(),
    faces: plan.faces.map((face) => [face.label, face.kind, face.cssWeight, face.italic, sha256(face.chars).slice(0, 12)]),
  });
  return sha256(payload).slice(0, 16);
}

/** 指纹一致 + 产物齐全（且没有多余的 woff2 残留）才算「不用重切」 */
function isUpToDate(key: string): boolean {
  if (!existsSync(PLAN_FILE) || !existsSync(FACE_CSS) || !existsSync(ASSETS_TS)) return false;

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

function loadBlobIndex(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(BLOB_INDEX, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
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
