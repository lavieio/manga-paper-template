/**
 * 分类 → 贴纸色。
 *
 * - 在 `manga-paper.config.ts` 的 `categories.colors` 里显式覆盖的分类，用覆盖色；
 * - 未覆盖的分类按分类名做稳定哈希取色：同一分类在构建之间、页面之间、服务端与浏览器之间
 *   始终得到同一个颜色，不使用随机数；
 * - 朱砂 `red` 留给精选 / CTA，不参与分类调色板。
 */

export const STICKER_COLORS = [
  "cyan",
  "pink",
  "yellow",
  "blue",
  "green",
  "orange",
  "violet",
  "lime",
] as const;

export type StickerColor = (typeof STICKER_COLORS)[number];

/** 空分类名的兜底色 */
export const DEFAULT_CATEGORY_COLOR: StickerColor = "blue";

const STICKER_COLOR_SET: ReadonlySet<string> = new Set(STICKER_COLORS);

export function isStickerColor(value: unknown): value is StickerColor {
  return typeof value === "string" && STICKER_COLOR_SET.has(value);
}

/** djb2：短字符串分布够用，且跨平台稳定 */
function hashCategory(value: string): number {
  let hash = 5381;
  for (const char of value) {
    hash = ((hash * 33) ^ (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash >>> 0;
}

/**
 * 分类贴纸色：显式覆盖优先，其余按名称哈希。
 * `overrides` 由 `src/config.ts` 从 `categories.colors` 解析后传入；客户端可省略。
 */
export function categoryColor(
  category: string,
  overrides: Readonly<Record<string, StickerColor>> = {},
): StickerColor {
  const key = category.trim();
  if (!key) return DEFAULT_CATEGORY_COLOR;
  return overrides[key] ?? STICKER_COLORS[hashCategory(key) % STICKER_COLORS.length] ?? DEFAULT_CATEGORY_COLOR;
}

/**
 * 校验并归一 `categories.colors` 配置。
 * 非法颜色在构建期报错，避免悄悄回退到蓝色。
 */
export function resolveCategoryColors(
  colors: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, StickerColor>> {
  const resolved: Record<string, StickerColor> = {};
  for (const [rawKey, rawValue] of Object.entries(colors ?? {})) {
    const key = rawKey.trim();
    if (!key) throw new Error("[categories.colors] 分类名不能为空");

    const value = rawValue.trim();
    if (!isStickerColor(value)) {
      throw new Error(
        `[categories.colors] 分类「${key}」的颜色「${rawValue}」不合法；可用值：${STICKER_COLORS.join(" / ")}`,
      );
    }
    resolved[key] = value;
  }
  return resolved;
}
