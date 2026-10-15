/**
 * 字体子集：字符集与切片策略（唯一来源）。
 *
 * 仓库里放的是**完整字体**（`assets/fonts/` 的上游原文件），构建期按当前内容现切。只有一类面：
 *
 * - **core** = 站点字符 ∪ 常用符号 → 每个字重各一份。它有四个调用点，用的是同一个
 *   「字符集 → 面」函数（见 `scripts/lib/font-plan.ts`）：
 *   (a) **开发期**：`astro dev` 没有按页那一步，页面就靠它；
 *   (b) **上线兜底**：每页的引用会被 `scripts/page-fonts.ts` 换成本页自己的子集，
 *       漏换的页面仍能用它；
 *   (c) **词汇宽的动态面**（构建期看不见、一屏就能铺开几百个字的地方，如搜索结果）：
 *       直接保留它（`scripts/page-fonts.ts` 的 `DYNAMIC_PAGES`）；
 *   (d) **跨源消费者**：同一份清单以稳定地址 `/maple-core.css` 发布（remark42 的评论区 iframe）。
 *
 * 站点字符集**之外**的字（用户现敲的生僻字、评论里的字、GB2312 以外的字）不再自托管：
 * 它们由 `src/styles/fonts.css` 里那两份**度量对齐**的 fallback（Consolas 系与系统 CJK）接管——
 * 推进宽度与行盒都对齐 MapleMono，所以换字体不会推动内容（CLS 实测 0.052 → 0.010），
 * 代价只是字形随平台。
 *
 * 本文件只回答「哪些字符、怎么切片」；怎么调 subset-font、怎么命名与写产物见 `scripts/build-fonts.ts`。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

export interface FontWeightPlan {
  /** 文件名与 @font-face 用的标签，如 `400` / `700` */
  readonly label: string;
  readonly cssWeight: number;
  readonly italic: boolean;
  /** 提交进仓的完整字体文件名（上游原名，放在 `assets/fonts/`） */
  readonly file: string;
}

/**
 * 站点实际用到的字重：正文 / 标题。
 *
 * 只留这两个面，因为每多一个面要付两份代价：一份 360–390 KB 的 core 子集，
 * 以及一次**整文档重排**（字体到货时全部文本重新排版，4× CPU 下实测单次 ≈160–700 ms 主线程）。
 * - 半粗 600 已移除：它只服务贴纸、标签这类小字 → CSS 里的 `font-weight: 600` 落到 700 字面；
 * - 引用斜体 400i 已移除：全站只有 `blockquote` 用斜体（`prose.css`，与 `demos/comic` 定稿一致），
 *   浏览器按 `font-synthesis` 从 400 面合成倾斜，省一份 380 KB 的字面。
 *
 * `assets/fonts/` 里的 SemiBold 仍要留：构建期渲染 OG 卡片直接读 TTF（`src/utils/og/font.ts` 用
 * 400/600/700）。Italic 目前没有消费者，留着只为随时能试回来。
 */
export const FONT_WEIGHTS: readonly FontWeightPlan[] = [
  { label: "400", cssWeight: 400, italic: false, file: "MapleMono-NF-CN-Regular.ttf" },
  { label: "700", cssWeight: 700, italic: false, file: "MapleMono-NF-CN-Bold.ttf" },
];

/** 首屏 preload 的字重（正文 + 标题）；其余按 unicode-range 按需取 */
export const PRELOAD_LABELS: readonly string[] = ["400", "700"];

/** core 里的常用符号块：ASCII / latin-1 / 箭头·数学·制表…（体积便宜，还能挡住未来的代码类文章） */
const SYMBOL_RANGES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // ASCII
  [0x00a0, 0x04ff], // latin-1 补充 + 拉丁扩展 + 国际音标 + 希腊 + 西里尔
  [0x1e00, 0x1eff], // 拉丁扩展附加
  [0x2000, 0x2bff], // 通用标点 → 箭头 / 数学 / 制表 / 方块 / 几何 / 杂项符号
  [0x2e80, 0x2fdf], // CJK 部首补充 + 康熙部首
  [0x3000, 0x303f], // CJK 符号与标点
  [0xfe00, 0xfe0f], // 变体选择符
  [0xff00, 0xffef], // 全角/半角形式
];

/** 控制字符与 BOM 不参与子集：换行/缩进没有字形，留在字符集里只会污染 unicode-range */
const CONTROLS = /[\u0000-\u001f\u007f\ufeff]/g;
/** 站点字符扫描：构建期真正会渲染成文本的文件类型 */
const SITE_EXTENSIONS = new Set([".md", ".mdx", ".astro", ".ts", ".js", ".mjs", ".css", ".json", ".txt", ".svg"]);
/**
 * 生成物自己：扫进来只会自我循环（内容哈希会反过来改指纹、unicode-range 文本会自我引用）。
 * 按**仓根相对路径**排除而不是按文件名：`font/assets.ts` 这种名字太常见，按文件名匹配
 * 会把以后任何一个同名文件静默漏出字集。
 */
const SITE_EXCLUDED_PATHS: readonly string[] = ["src/utils/font/assets.ts", "src/styles/fonts-core.css"];
/** 会被渲染成文本的地方：`src/` 全是，另加配置文件 */
const SITE_ROOTS: readonly string[] = ["src", "astro.config.mjs"];
/** 不扫的目录 */
const SITE_SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".cache"]);

/** 产物的文件名：`maple-400-core.<内容哈希>.woff2`（构建期生成，不进仓） */
export function faceFileName(label: string, kind: string, hash: string): string {
  return `maple-${label}-${kind}.${hash}.woff2`;
}

/** 字符串 → 去重后的码位列表（`[...text]` 按码位迭代，代理对不会拆开） */
export function codepointsOf(text: string): number[] {
  return [...new Set([...text].map((char) => char.codePointAt(0) ?? 0))];
}

/** 去重并按码位升序（字符集与 unicode-range 都要确定性输出） */
export function sortChars(text: string): string {
  return [...new Set(text)].sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)).join("");
}

/** 常用符号块（ASCII + latin-1 + 箭头/数学/制表/方块/几何/杂项/全角…） */
export function symbolCharset(): string {
  let out = "";
  for (const [from, to] of SYMBOL_RANGES) {
    for (let code = from; code <= to; code += 1) out += String.fromCodePoint(code);
  }
  return out.replace(CONTROLS, "");
}

/**
 * 站点字符：扫 `src/`（含 content 与界面文案）与配置文件。
 * 私密/草稿文章也在这里面——它们在构建期被加密成密文，产物 HTML 里看不到正文，
 * 但读者在浏览器解密后要用到这些字形，所以必须按**源码**扫，不能按产物扫。
 */
export function siteCharset(root: string): string {
  const chars = new Set<string>();
  for (const entry of SITE_ROOTS) {
    const path = join(root, entry);
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) collectDir(path, chars);
    else collectFile(path, chars);
  }
  return sortChars([...chars].join(""));
}

/**
 * **站点字面**：全站字符 + 常用符号。它是「词汇宽」那几个调用点共用的字符集——
 * `astro dev`、兜底、构建期看不见正文的页（`scripts/page-fonts.ts` 的 `DYNAMIC_PAGES`）、
 * 以及跨源主题（`/maple-core.css`）。
 */
export function siteFaceCharset(root: string): string {
  return sortChars(siteCharset(root) + symbolCharset());
}

function collectDir(dir: string, chars: Set<string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SITE_SKIP_DIRS.has(entry.name)) collectDir(path, chars);
    } else {
      collectFile(path, chars);
    }
  }
}

function collectFile(path: string, chars: Set<string>): void {
  if (!SITE_EXTENSIONS.has(extname(path))) return;
  const normalized = path.split("\\").join("/");
  if (SITE_EXCLUDED_PATHS.some((excluded) => normalized.endsWith(`/${excluded}`))) return;
  for (const char of readFileSync(path, "utf8").replace(CONTROLS, "")) chars.add(char);
}

/** 码位集合 → CSS `unicode-range`（连续段合并，整块合并成 `U+XX??`） */
export function toUnicodeRange(codepoints: Iterable<number>): string {
  const sorted = [...new Set(codepoints)].sort((a, b) => a - b);
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < sorted.length) {
    let end = cursor;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1;
    tokens.push(...runTokens(sorted[cursor], sorted[end]));
    cursor = end + 1;
  }
  return tokens.join(",");
}

/** 一段连续码位：每 256 个一组的整块写成 `U+XX??`，碎块写成 `U+XXXX` / `U+XXXX-YYYY` */
function runTokens(from: number, to: number): string[] {
  const tokens: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    const blockEnd = cursor | 0xff;
    if ((cursor & 0xff) === 0 && cursor <= 0xff00 && blockEnd <= to) {
      tokens.push(`U+${hex(cursor >> 8, 2)}??`);
      cursor = blockEnd + 1;
      continue;
    }
    const stop = cursor <= 0xff00 ? Math.min(to, blockEnd) : to;
    tokens.push(cursor === stop ? `U+${hex(cursor, 4)}` : `U+${hex(cursor, 4)}-${hex(stop, 4)}`);
    cursor = stop + 1;
  }
  return tokens;
}

function hex(code: number, width: number): string {
  return code.toString(16).toUpperCase().padStart(width, "0");
}
