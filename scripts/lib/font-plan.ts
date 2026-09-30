/**
 * 切面清单：把「站点字符 + 符号」按字重与 unicode-range 切成一个个要生成的面。
 *
 * 纯函数（不做 IO），所以能单测；真正的子集化与写文件在 `scripts/build-fonts.ts`。
 *
 * 关键点：每个面的字符集是「请求的字符集 ∩ 完整字体真正提供的字形」。交集这一步不能省，
 * 否则 ✅❌➕ 这类字库里根本没有的字符会被写进 unicode-range，覆盖断言就白做了。
 */
import { FONT_WEIGHTS, PRELOAD_LABELS, TAIL_LABELS, gb2312Level1Areas, sortChars, symbolCharset, type FontWeightPlan } from "./font-charsets.ts";

export interface FacePlan {
  /** 字重标签，如 `400` / `400i` */
  readonly label: string;
  /** 面的种类，也是文件名里的一段：`core` 或 `l1-<区号>` */
  readonly kind: string;
  readonly cssWeight: number;
  readonly italic: boolean;
  /** 真正要交给 subset-font 的字符 */
  readonly chars: string;
  /** 是否首屏 preload（只有 core 的 400/700） */
  readonly preload: boolean;
}

export interface FontPlan {
  readonly faces: readonly FacePlan[];
  /** 站点用到、但任何字重都给不出的字符 → 回落度量对齐的 fallback（构建日志会告警） */
  readonly missing: string;
}

/** 一个字重对应的字体 cmap（码位集合）；缺这个字重就等于没有字形 */
export type FontCmaps = ReadonlyMap<string, ReadonlySet<number>>;

export function planFaces(site: string, cmaps: FontCmaps): FontPlan {
  const core = sortChars(site + symbolCharset());
  const faces: FacePlan[] = [];

  for (const weight of FONT_WEIGHTS) faces.push(coreFace(weight, core, cmaps.get(weight.label)));
  for (const area of gb2312Level1Areas()) {
    for (const label of TAIL_LABELS) {
      const face = tailFace(label, area, core, cmaps.get(label));
      if (face) faces.push(face);
    }
  }
  return { faces, missing: missingChars(site, cmaps) };
}

function coreFace(weight: FontWeightPlan, core: string, cmap: ReadonlySet<number> | undefined): FacePlan {
  return {
    label: weight.label,
    kind: "core",
    cssWeight: weight.cssWeight,
    italic: weight.italic,
    chars: supported(core, cmap),
    preload: PRELOAD_LABELS.includes(weight.label),
  };
}

/** GB2312 一级里 core 之外的剩余字：core 已经覆盖的字不能留在 tail，否则是白下载 */
function tailFace(
  label: string,
  area: { readonly area: number; readonly chars: string },
  core: string,
  cmap: ReadonlySet<number> | undefined,
): FacePlan | null {
  const weight = FONT_WEIGHTS.find((item) => item.label === label);
  if (!weight) return null;

  const chars = [...supported(area.chars, cmap)].filter((char) => !core.includes(char)).join("");
  return chars === ""
    ? null
    : { label, kind: `l1-${area.area}`, cssWeight: weight.cssWeight, italic: weight.italic, chars, preload: false };
}

/** 站点用到、任何字重都没有字形的字符 */
function missingChars(site: string, cmaps: FontCmaps): string {
  const available = [...cmaps.values()];
  return sortChars([...site].filter((char) => !available.some((cmap) => cmap.has(char.codePointAt(0) ?? 0))).join(""));
}

/** 请求的字符里，完整字体真正提供的那些（顺序保持输入的确定性） */
function supported(chars: string, cmap: ReadonlySet<number> | undefined): string {
  if (!cmap) return "";
  return [...chars].filter((char) => cmap.has(char.codePointAt(0) ?? 0)).join("");
}
