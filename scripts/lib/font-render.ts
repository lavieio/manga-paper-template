/**
 * 字体产物的文本渲染：`src/styles/fonts-core.css`、`public/maple-core.css`、
 * `src/utils/font/assets.ts` 与发布目录的说明文件。
 *
 * 只有**一个**渲染函数：给一批「面 + 产物文件名」，吐一段 `@font-face` 清单。
 * core 与按页子集 的差别只在于调用方传进来的是哪批面（见 `font-plan.ts`）。
 * 纯字符串拼装（不做 IO），写文件在 `scripts/build-fonts.ts` 与 `scripts/page-fonts.ts`。
 */
import { codepointsOf, toUnicodeRange } from "./font-charsets.ts";
import type { FacePlan } from "./font-plan.ts";

/** 一个面与它的产物文件名 */
export interface FaceFile {
  readonly face: FacePlan;
  readonly name: string;
}

export const CORE_FACE_CSS_HEADER = [
  "/* Maple Mono NF CN 的全站核心字面（自托管子集）。",
  "   ⚠️ 生成物：`npm run fonts`（scripts/build-fonts.ts）——改这里会被下次构建覆盖，",
  "   要改字符集与切片策略请改 scripts/lib/font-charsets.ts。",
  "   core = 站点字符 + 常用符号，就是 Base.astro preload 的那两个字面（400 / 700）。",
  "   上线产物里每页的这两条引用会被 scripts/page-fonts.ts 换成本页自己的子集",
  "   （maple-<字重>-page.<hash>.woff2）：dev、兜底与宽词汇页靠这份 core 兜底。",
  "   同一份清单还会原样写到 `public/maple-core.css`（稳定地址），给跨源消费者",
  "   （remark42 的评论区 iframe）当主题 CSS 用。 */",
].join("\n");

/** 全站 core 与按页子集共用一个字族：范围互不相交，先后顺序不影响匹配 */
const FAMILY = "Maple Mono NF CN";

/** 一批面 → 一段 `@font-face` 清单（core 与按页 都走这里） */
export function renderFaceCss(files: readonly FaceFile[], header: string): string {
  return files.length === 0 ? "" : `${header}\n${files.map(renderFile).join("\n")}\n`;
}

function renderFile(file: FaceFile): string {
  const { face, name } = file;
  const range = toUnicodeRange(codepointsOf(face.chars));
  const style = face.italic ? "italic" : "normal";
  return (
    `@font-face{font-family:"${FAMILY}";src:url("/fonts/${name}")format("woff2");` +
    `font-weight:${face.cssWeight};font-style:${style};font-display:swap;unicode-range:${range}}`
  );
}

/** `src/utils/font/assets.ts`：Base.astro 只从这里取 preload 清单 */
export function renderFontAssets(preload: readonly string[]): string {
  return [
    "/** 生成物（`npm run fonts`）；不要手改，改策略请改 scripts/lib/font-charsets.ts。 */",
    "export const FONT_PRELOAD = [",
    preload.map((url) => `  "${url}",`).join("\n"),
    "] as const;",
    "",
  ].join("\n");
}

/** 发布目录里的说明：`public/fonts/README.md`（产物不进仓，所以说明跟着产物走） */
export const FONT_DIR_README = [
  "# 自托管字体子集（构建产物，不进仓）",
  "",
  "由 `npm run fonts`（scripts/build-fonts.ts）从提交进仓的完整字体 `assets/fonts/*.ttf` 切出：",
  "",
  "- `maple-<字重>-core.<hash>.woff2`：站点字符 + 常用符号，页面 preload 400 与 700 这两份。",
  "  它是**开发期与兜底**用的：`astro dev` 用它；词汇宽的动态面（搜索页）保留它；",
  "  同一份清单还以稳定地址 `/maple-core.css` 发给跨源消费者（remark42 的评论区 iframe）。",
  "- `maple-<字重>-page.<hash>.woff2`：上线产物里每页自己的子集，由 `scripts/page-fonts.ts`",
  "  在 `astro build` 之后切出（只含该页会渲染的字，首访字节约为 core 的 1/5）。",
  "",
  "站点字符集**之外**的字（用户现敲的生僻字、评论里的字）不自托管：由",
  "`src/styles/fonts.css` 里那两份**度量对齐**的 fallback（Consolas 系与系统 CJK）接管——",
  "推进宽度与行盒都对齐 MapleMono，换字体不推动内容（CLS 实测 0.052 → 0.010），字形随平台。",
  "许可证见同目录 `LICENSE.txt`（复制自 `assets/fonts/LICENSE.txt`）。",
  "",
].join("\n");
