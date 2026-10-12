/**
 * 页面里「按页字体」的换装（纯函数）。
 *
 * 构建期 `npm run fonts` 生成的是**全站** core 字面（开发期与兜底用），
 * `astro build` 出来的每个页面都引用它。上线前按页把这两处引用换成本页自己的产物：
 *
 * - `<link rel="preload">` 的 href；
 * - 内联 `@font-face` 的 `src: url(/fonts/…)` 与它后面那个 `unicode-range`。
 *
 * unicode-range 必须一起收窄：只换文件不换 range 的话，浏览器会认为这个面「覆盖」
 * 全站字符集，页面里那些**没进子集**的字（动态注入、样式表生成、密文解密后出现）
 * 就会画成豆腐块，而不是回落到度量对齐的 fallback。收窄后最坏情况只是换了个字体。
 *
 * 文件名替换用 `replaceAll`：同一个名字在内联 CSS 与 preload 里各出现一次，一次换干净。
 * 内联 CSS 已经过 Astro 的压缩（引号被去掉、hex 大写），所以 url 的引号要当可选的写。
 */
export interface FaceSwap {
  /** 构建期生成的全站 core 文件名（如 `maple-400-core.1fa11129.woff2`） */
  readonly oldName: string;
  /** 本页自己的产物文件名 */
  readonly newName: string;
  /** 本页字符集压缩成的 unicode-range（不含 `unicode-range:` 前缀） */
  readonly unicodeRange: string;
}

export function swapFaceRefs(html: string, swaps: readonly FaceSwap[]): string {
  let out = html;
  for (const swap of swaps) {
    out = out.replaceAll(swap.oldName, swap.newName);
    out = out.replace(rangePattern(swap.newName), (_match, head: string) => `${head}${swap.unicodeRange}`);
  }
  return out;
}

/** 指向该文件的 `@font-face` 规则里、`unicode-range` 之前的那段（含冒号） */
function rangePattern(name: string): RegExp {
  const url = `url\\(\\s*["']?/fonts/${escapeRegExp(name)}["']?\\s*\\)`;
  return new RegExp(`(${url}[^}]*?unicode-range\\s*:\\s*)[^;}]+`, "g");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
