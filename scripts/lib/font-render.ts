/**
 * 字体产物的文本渲染：`src/styles/fonts-face.css`、`src/utils/font-assets.ts` 与发布目录的说明文件。
 * 纯字符串拼装（不做 IO），写文件在 `scripts/build-fonts.ts`。
 */import { codepointsOf, toUnicodeRange } from "./font-charsets.ts";
import type { FacePlan } from "./font-plan.ts";

export const FACE_CSS_HEADER = [
  "/* Maple Mono NF CN 的自托管子集。",
  "   ⚠️ 生成物：`npm run fonts`（scripts/build-fonts.ts）——改这里会被下次构建覆盖，",
  "   要改字符集与切片策略请改 scripts/lib/font-charsets.ts。",
  "   core = 站点字符 + 常用符号（首屏 preload 400/700）；",
  "   tail = GB2312 一级里 core 之外的剩余字，按「1 个区（94 字）」切片，",
  "   浏览器只在页面真出现那些字时才取。",
  "   tail 先声明、core 后声明：同一个码位万一重叠，preload 过的 core 胜出。 */",
].join("\n");

const FAMILY = "Maple Mono NF CN";

/** `@font-face` 清单：tail 在前、core 在后 */
export function renderFaceCss(faces: readonly FacePlan[], names: readonly string[]): string {
  const pairs = faces.map((face, index) => ({ face, name: names[index] ?? "" }));
  const ordered = [...pairs.filter((item) => item.face.kind !== "core"), ...pairs.filter((item) => item.face.kind === "core")];
  return `${FACE_CSS_HEADER}\n${ordered.map((item) => renderFace(item.face, item.name)).join("\n")}\n`;
}

function renderFace(face: FacePlan, name: string): string {
  const range = toUnicodeRange(codepointsOf(face.chars));
  const style = face.italic ? "italic" : "normal";
  return (
    `@font-face{font-family:"${FAMILY}";src:url("/fonts/${name}")format("woff2");` +
    `font-weight:${face.cssWeight};font-style:${style};font-display:swap;unicode-range:${range}}`
  );
}

/** `src/utils/font-assets.ts`：Base.astro 只从这里取 preload 清单与计划指纹 */
export function renderFontAssets(faces: readonly FacePlan[], names: readonly string[], key: string): string {
  const preload = faces
    .map((face, index) => ({ face, name: names[index] ?? "" }))
    .filter((item) => item.face.preload)
    .map((item) => `  "/fonts/${item.name}",`)
    .join("\n");

  return [
    "/** 生成物（`npm run fonts`）；不要手改，改策略请改 scripts/lib/font-charsets.ts。 */",
    "export const FONT_PRELOAD = [",
    preload,
    "] as const;",
    "",
    "/** 字符集 + 字体 + 生成器版本的指纹：一致就整个跳过生成步骤（`.cache/fonts/plan.json`） */",
    `export const FONT_PLAN_KEY = "${key}";`,
    "",
  ].join("\n");
}

/** 发布目录里的说明：`public/fonts/README.md`（产物不进仓，所以说明跟着产物走） */
export const FONT_DIR_README = [
  "# 自托管字体子集（构建产物，不进仓）",
  "",
  "由 `npm run fonts`（scripts/build-fonts.ts）从提交进仓的完整字体 `assets/fonts/*.ttf` 切出：",
  "",
  "- `maple-<字重>-core.<hash>.woff2`：站点字符 + 常用符号，页面 preload 400 与 700 这两份；",
  "- `maple-<字重>-l1-<区>.<hash>.woff2`：GB2312 一级里 core 之外的剩余字，按区切片，",
  "  浏览器只在页面真出现那些字时才取（GB2312 一级以内永不缺字）。",
  "",
  "覆盖不到的字符（GB2312 以外、或字库里本来就没有的 ✅❌➕ / 康熙部首）会落到",
  "`src/styles/fonts.css` 里那份度量对齐的 fallback。",
  "许可证见同目录 `LICENSE.txt`（复制自 `assets/fonts/LICENSE.txt`）。",
  "",
].join("\n");
