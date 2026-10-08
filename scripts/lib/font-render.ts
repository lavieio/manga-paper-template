/**
 * 字体产物的文本渲染：`src/styles/fonts-core.css`、`public/fonts/maple-tail.*.css`、
 * `src/utils/font-assets.ts` 与发布目录的说明文件。
 * 纯字符串拼装（不做 IO），写文件在 `scripts/build-fonts.ts`。
 */import { codepointsOf, toUnicodeRange } from "./font-charsets.ts";
import type { FacePlan } from "./font-plan.ts";

export const CORE_FACE_CSS_HEADER = [
  "/* Maple Mono NF CN 的核心字面（自托管子集）。",
  "   ⚠️ 生成物：`npm run fonts`（scripts/build-fonts.ts）——改这里会被下次构建覆盖，",
  "   要改字符集与切片策略请改 scripts/lib/font-charsets.ts。",
  "   core = 站点字符 + 常用符号，就是 Base.astro preload 的那两个字面（400 / 700）。",
  "   GB2312 一级里 core 之外的剩余字（tail）单独出成 `/fonts/maple-tail.<hash>.css` 异步挂载：",
  "   tail 生成时已剔除 core 的码位，两张表互不重叠，先后顺序不影响字体匹配。 */",
].join("\n");

export const TAIL_FACE_CSS_HEADER = [
  "/* Maple Mono NF CN 的 tail 字面（自托管子集）。",
  "   ⚠️ 生成物：`npm run fonts`（scripts/build-fonts.ts）——改这里会被下次构建覆盖。",
  "   tail = GB2312 一级里 core 之外的剩余字，按「1 个区（94 字）」切片，",
  "   浏览器只在页面真出现那些字时才去取对应 woff2。",
  "   这份清单不内联进 HTML：它是一长串 unicode-range，内联等于每个页面都重下一次（HTML 不可缓存）；",
  "   出成 content-hash 命名的独立 CSS 后由 `/fonts/*` 的 immutable 规则长期缓存，",
  "   Base.astro 用 media=print + onload 异步挂载，不阻塞首屏。 */",
].join("\n");

const FAMILY = "Maple Mono NF CN";

/** core 的 `@font-face` 清单：跟随页面 CSS 一起内联（体积只有两个字面，值得省这一遭 RTT） */
export function renderCoreFaceCss(faces: readonly FacePlan[], names: readonly string[]): string {
  const rules = pairsOf(faces, names).filter((item) => item.face.kind === "core");
  return rules.length === 0 ? "" : `${CORE_FACE_CSS_HEADER}\n${rules.map(renderPair).join("\n")}\n`;
}

/** tail 的 `@font-face` 清单：独立的异步 CSS；没有 tail 面时返回空串（调用方据此不写文件） */
export function renderTailFaceCss(faces: readonly FacePlan[], names: readonly string[]): string {
  const rules = pairsOf(faces, names).filter((item) => item.face.kind !== "core");
  return rules.length === 0 ? "" : `${TAIL_FACE_CSS_HEADER}\n${rules.map(renderPair).join("\n")}\n`;
}

/** 面与其产物文件名一一对应（`names` 与 `faces` 同序） */
function pairsOf(faces: readonly FacePlan[], names: readonly string[]): readonly { readonly face: FacePlan; readonly name: string }[] {
  return faces.map((face, index) => ({ face, name: names[index] ?? "" }));
}

function renderPair(item: { readonly face: FacePlan; readonly name: string }): string {
  return renderFace(item.face, item.name);
}

function renderFace(face: FacePlan, name: string): string {
  const range = toUnicodeRange(codepointsOf(face.chars));
  const style = face.italic ? "italic" : "normal";
  return (
    `@font-face{font-family:"${FAMILY}";src:url("/fonts/${name}")format("woff2");` +
    `font-weight:${face.cssWeight};font-style:${style};font-display:swap;unicode-range:${range}}`
  );
}

/** `src/utils/font-assets.ts`：Base.astro 只从这里取 preload 清单、tail CSS 地址与计划指纹 */
export function renderFontAssets(
  faces: readonly FacePlan[],
  names: readonly string[],
  key: string,
  tailCssUrl: string | null,
): string {
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
    "/** tail 字面清单的地址（独立 immutable CSS）；没有 tail 面时为 null，Base.astro 就不挂这条 */",
    `export const FONT_TAIL_CSS: string | null = ${tailCssUrl === null ? "null" : `"${tailCssUrl}"`};`,
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
  "  浏览器只在页面真出现那些字时才取（GB2312 一级以内永不缺字）；",
  "- `maple-tail.<hash>.css`：上面那批 l1 面的 `@font-face` 清单，由页面异步挂载",
  "  （内容哈希命名 → 长期 immutable 缓存；内联进 HTML 的话每个页面都要重下一遍）。",
  "",
  "覆盖不到的字符（GB2312 以外、或字库里本来就没有的 ✅❌➕ / 康熙部首）会落到",
  "`src/styles/fonts.css` 里那份度量对齐的 fallback。",
  "许可证见同目录 `LICENSE.txt`（复制自 `assets/fonts/LICENSE.txt`）。",
  "",
].join("\n");
