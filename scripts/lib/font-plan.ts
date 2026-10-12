/**
 * 切面清单：**一个字符集 → 每个字重一个面**。
 *
 * core / tail / 按页子集 都是这一个函数，区别只在「字符集怎么来」：
 * - core：`siteFaceCharset()` —— 站点字符 + 常用符号（dev、兜底、宽词汇页、跨源主题都用它）；
 * - tail：`tailCharsets()` —— GB2312 一级每区减去 core（同族范围不许重叠，否则会双份下载）；
 * - 按页：该页渲染出来的字符（宽词汇页则退化成站点字面）。
 *
 * 纯函数（不做 IO），所以能单测；真正的子集化与写文件在 `scripts/build-fonts.ts`
 * 与 `scripts/page-fonts.ts`，两者共用 `scripts/lib/font-faces.ts`。
 *
 * 关键点：每个面的字符集是「请求的字符集 ∩ 完整字体真正提供的字形」。交集这一步不能省，
 * 否则 ✅❌➕ 这类字库里根本没有的字符会被写进 unicode-range，覆盖断言就白做了。
 */
import { FONT_WEIGHTS, sortChars } from "./font-charsets.ts";

export interface FacePlan {
  readonly label: string;
  /** 文件名里那一段，也是 blob 缓存键的一部分：`core` / `l1-16` / `page` */
  readonly kind: string;
  readonly cssWeight: number;
  readonly italic: boolean;
  readonly chars: string;
  /** 是否由 Base.astro preload（只有 core 的 400 / 700） */
  readonly preload: boolean;
}

/** 一个调用点的入参：只有「叫什么」与「要不要 preload」会变 */
export interface FaceOptions {
  /** 文件名里那一段（`core` / `l1-16` / `page`） */
  readonly kind: string;
  /** 要切哪些字重，默认 `FONT_WEIGHTS` 全部 */
  readonly labels?: readonly string[];
  /** 要 preload 的字重，默认一个都不 preload */
  readonly preload?: readonly string[];
}

/** 一个字重对应的字体 cmap（码位集合）；缺这个字重就等于没有字形 */
export type FontCmaps = ReadonlyMap<string, ReadonlySet<number>>;

/** 一个字符集 → 每个字重一个面（只留完整字体真有的字形；空面不生成） */
export function planFacesFor(charset: string, cmaps: FontCmaps, options: FaceOptions): FacePlan[] {
  const wanted = options.labels ?? FONT_WEIGHTS.map((weight) => weight.label);
  const faces: FacePlan[] = [];

  for (const weight of FONT_WEIGHTS) {
    if (!wanted.includes(weight.label)) continue;
    const chars = supported(charset, cmaps.get(weight.label));
    if (chars === "") continue;
    faces.push({
      label: weight.label,
      kind: options.kind,
      cssWeight: weight.cssWeight,
      italic: weight.italic,
      chars,
      preload: (options.preload ?? []).includes(weight.label),
    });
  }
  return faces;
}

/** 站点用到、任何字重都没有字形的字符（回落度量对齐的 fallback 是设计内） */
export function missingChars(site: string, cmaps: FontCmaps): string {
  const available = [...cmaps.values()];
  return sortChars([...site].filter((char) => !available.some((cmap) => cmap.has(char.codePointAt(0) ?? 0))).join(""));
}

/** 请求的字符里，完整字体真正提供的那些（顺序保持输入的确定性） */
function supported(chars: string, cmap: ReadonlySet<number> | undefined): string {
  if (!cmap) return "";
  return [...chars].filter((char) => cmap.has(char.codePointAt(0) ?? 0)).join("");
}
