/**
 * OG 卡片文本度量：等宽字体的「一行放得下几个字符」可以直接算，不必渲染后量。
 *
 * Maple Mono NF CN 的 hmtx：拉丁/数字/半角 = 0.6em，CJK/全角 = 1.2em（正好两格）。
 * 卡片上所有元素都是等宽的，所以推进宽度是精确值，裁剪结论与渲染结果一致。
 */

/** 拉丁/数字/半角的推进宽度（em） */
const LATIN_EM = 0.6;
/** CJK 与全角标点的推进宽度（em） */
const WIDE_EM = 1.2;
/** 裁剪标记：放不下的尾巴统一换成它（0.6em，占一格） */
export const ELLIPSIS = "…";
/**
 * 推进宽度比较的容差：0.6×56×7 + 1.2×56×9 这类组合会算出 848.0000000000001，
 * 正好卡在上限的标题会因此被误裁。
 */
const ADVANCE_EPSILON = 0.5;

/** 按全角（2 格）计宽的码位段：CJK、假名、谚文、全角形式、全角标点、emoji 兜底 */
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1faff],
];

/** 扩展平面的 CJK（U+20000 起）也是全角 */
export function isWideCodepoint(code: number): boolean {
  if (code >= 0x2_0000 && code <= 0x3_fffd) return true;
  return WIDE_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** 单个字符的推进宽度（px），含字距 */
export function charAdvance(char: string, size: number, letterSpacing = 0): number {
  return (isWideCodepoint(char.codePointAt(0) ?? 0) ? WIDE_EM : LATIN_EM) * size + letterSpacing;
}

/** 整串的推进宽度（px） */
export function advanceOf(text: string, size: number, letterSpacing = 0): number {
  let width = 0;
  for (const char of text) width += charAdvance(char, size, letterSpacing);
  return width;
}

/** 单行裁剪：放不下就 `slice(0, max - 1) + '…'`（max 由推进宽度反推） */
export function fitOneLine(text: string, maxWidth: number, size: number, letterSpacing = 0): string {
  if (advanceOf(text, size, letterSpacing) <= maxWidth + ADVANCE_EPSILON) return text;
  return truncateWithEllipsis(text, maxWidth, size, letterSpacing);
}

/**
 * 裁剪到 N 行：放不下时保留前 N-1 行，第 N 行末尾换成省略号。
 * 返回的文本可能没有换行符——交由 Satori 在同样的宽度里自动折行，
 * 而每行的推进宽度都不超过 maxWidth，所以折行结果与这里的判断一致。
 */
export function fitLines(
  text: string,
  maxWidth: number,
  size: number,
  letterSpacing: number,
  maxLines: number,
): string {
  const lines = wrap(text, maxWidth, size, letterSpacing);
  if (lines.length <= maxLines) return lines.join("");
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = truncateWithEllipsis(kept[maxLines - 1], maxWidth, size, letterSpacing);
  return kept.join("");
}

/** 贪心折行：拉丁按词断，CJK 按字断（与浏览器的换行规则一致） */
function wrap(text: string, maxWidth: number, size: number, letterSpacing = 0): string[] {
  const lines: string[][] = [[]];
  let word: string[] = [];
  let used = 0;
  const current = () => lines[lines.length - 1];
  const flushWord = () => {
    current().push(...word);
    word = [];
  };
  for (const char of text) {
    const advance = charAdvance(char, size, letterSpacing);
    if (used + advance > maxWidth && current().length > 0) {
      flushWord();
      lines.push([]);
      used = 0;
    }
    if (/\s/.test(char) || isWideCodepoint(char.codePointAt(0) ?? 0)) {
      flushWord();
      current().push(char);
    } else {
      word.push(char);
    }
    used += advance;
  }
  flushWord();
  return lines.map((line) => line.join(""));
}

/** 取到「加上省略号也不超过 maxWidth」的最长前缀 */
function truncateWithEllipsis(text: string, maxWidth: number, size: number, letterSpacing: number): string {
  const budget = maxWidth - charAdvance(ELLIPSIS, size, letterSpacing);
  const kept: string[] = [];
  let width = 0;
  for (const char of text) {
    const advance = charAdvance(char, size, letterSpacing);
    if (width + advance > budget) break;
    kept.push(char);
    width += advance;
  }
  return kept.join("").replace(/\s+$/, "") + ELLIPSIS;
}

/** ASCII 可见区（含空格）：卡片上的路径、日期、数字都在这里 */
function asciiCharset(): string {
  let out = "";
  for (let code = 0x20; code <= 0x7e; code += 1) out += String.fromCharCode(code);
  return out;
}

/**
 * OG 字体子集要覆盖的字符集：ASCII + 卡片实际渲染出来的全部文本。
 * 调用方传进来的文本就是树里那些字符串，所以不会漏字（改了版式也不用同步改这里）。
 */
export function ogCharset(texts: readonly string[]): string {
  return [...new Set([asciiCharset(), ...texts].join(""))].sort().join("");
}
