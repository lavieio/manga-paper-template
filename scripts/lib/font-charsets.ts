/**
 * P1-1 字体子集：字符集与切片策略（唯一来源）。
 *
 * 仓库里放的是**完整字体**（`assets/fonts/` 的 4 个字重，上游原文件），构建期按当前内容现切：
 * - **core** = 站点字符 ∪ 常用符号 → 4 个字重各一份，首屏 preload 400/700；
 * - **tail** = GB2312 一级里 core 之外的剩余字 → 按「1 个区（94 字）」切片，只做 400/700，
 *   交给浏览器按 `unicode-range` 按需取（GB2312 一级以内永不缺字）；
 * - core/tail 都覆盖不到的字符（GB2312 以外、或字库里本来就没有的 ✅❌➕）回落度量对齐的 fallback。
 *
 * 本文件只回答「哪些字符、怎么切片」；怎么调 subset-font、怎么命名与写产物见 `scripts/build-fonts.ts`。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

export interface FontWeightPlan {
  /** 文件名与 @font-face 用的标签，如 `400` / `400i` */
  readonly label: string;
  readonly cssWeight: number;
  readonly italic: boolean;
  /** 提交进仓的完整字体文件名（上游原名，放在 `assets/fonts/`） */
  readonly file: string;
}

/** 站点实际用到的 4 个字重：正文 / 引用斜体 / 贴纸 / 标题 */
export const FONT_WEIGHTS: readonly FontWeightPlan[] = [
  { label: "400", cssWeight: 400, italic: false, file: "MapleMono-NF-CN-Regular.ttf" },
  { label: "400i", cssWeight: 400, italic: true, file: "MapleMono-NF-CN-Italic.ttf" },
  { label: "600", cssWeight: 600, italic: false, file: "MapleMono-NF-CN-SemiBold.ttf" },
  { label: "700", cssWeight: 700, italic: false, file: "MapleMono-NF-CN-Bold.ttf" },
];

/** 首屏 preload 的字重（正文 + 标题）；其余按 unicode-range 按需取 */
export const PRELOAD_LABELS: readonly string[] = ["400", "700"];

/** tail 只做这两个字重：600 / italic 的生僻字由同家族 400/700 的字形兜住（CSS 字体匹配规则） */
export const TAIL_LABELS: readonly string[] = ["400", "700"];

/** GB2312 一级汉字的区号范围（16–55）；tail 的切片单位就是「区」 */
export const GB2312_LEVEL1_AREA = { first: 16, last: 55 } as const;

/** core 里的常用符号块（口径同 P1-1 可行性评估的 A2：便宜且能挡住未来的代码类文章） */
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
/** 生成物自己：扫进来只会自我循环（unicode-range 文本、内容哈希） */
const SITE_EXCLUDED = new Set(["font-assets.ts", "fonts-face.css"]);
/** 会被渲染成文本的地方：`src/` 全是，另加配置文件 */
const SITE_ROOTS: readonly string[] = ["src", "astro.config.mjs"];
/** 不扫的目录 */
const SITE_SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".cache"]);

const GB2312_DECODER = new TextDecoder("gb2312");
const REPLACEMENT = "\uFFFD";

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

/**
 * 一个 GB2312 区 = 低字节 0xA1–0xFE 共 94 个字符；未定义的位置解码成 U+FFFD，丢掉。
 * 注：WHATWG 的 `gb2312` 解码器实际是 GBK（GB2312 的超集），个别空位会被填上 GBK 的字，
 * 这对我们无害——tail 只是「一级里 core 之外」的兜底，多几个字不影响首屏，也不会漏字。
 */
export function gb2312Area(area: number): string {
  const lead = 0xa0 + area;
  let out = "";
  for (let trail = 0xa1; trail <= 0xfe; trail += 1) out += GB2312_DECODER.decode(Uint8Array.of(lead, trail));
  return out.replaceAll(REPLACEMENT, "");
}

/** GB2312 一级汉字，按区返回（tail 的切片单位） */
export function gb2312Level1Areas(): readonly { readonly area: number; readonly chars: string }[] {
  const areas: { area: number; chars: string }[] = [];
  for (let area = GB2312_LEVEL1_AREA.first; area <= GB2312_LEVEL1_AREA.last; area += 1) {
    areas.push({ area, chars: gb2312Area(area) });
  }
  return areas;
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
  if (!SITE_EXTENSIONS.has(extname(path)) || SITE_EXCLUDED.has(path.split(/[\\/]/).pop() ?? "")) return;
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
