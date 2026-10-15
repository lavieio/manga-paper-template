/**
 * OG 卡片字体：Satori 只吃 TTF / OTF / WOFF（不吃 woff2），
 * 所以按卡片真正用到的字符现切一份小 TTF，而不是把 20MB 的整字重整个喂给它。
 *
 * 子集按「字符集 + 字重 + 原字体内容」的哈希缓存在 `.cache/og-fonts/`：
 * 同一个字符集在一个构建里只切一次（同路由的多张卡片复用），不进产物、可随时删。
 * 切一份约 106 ms、产物约 16 KB（35 字符），比解析整字重快得多。
 *
 * 字符集由调用方从**真正的卡片文本**算出来（`ogCharset` + `collectTexts`），
 * 不用手工维护字表——版式里新加一句文案不会漏字。
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";

/** @font-face 意义上的族名；元素树里也用它 */
export const OG_FONT_FAMILY = "Maple OG";

/** 卡片用到的三个字重：顶栏与页脚正文 / 摘要 / 标题与标签 */
const OG_WEIGHTS: readonly { readonly weight: number; readonly file: string }[] = [
  { weight: 400, file: "MapleMono-NF-CN-Regular.ttf" },
  { weight: 600, file: "MapleMono-NF-CN-SemiBold.ttf" },
  { weight: 700, file: "MapleMono-NF-CN-Bold.ttf" },
];

const FONT_DIR = join(process.cwd(), "assets/fonts");
const CACHE_DIR = join(process.cwd(), ".cache/og-fonts");

/** 交给 Satori 的字体（形状与它的 FontOptions 一致） */
export interface OgFont {
  readonly name: string;
  readonly weight: number;
  readonly data: Buffer;
}

/** 内存缓存：同一次构建里两张路由、十几张卡片共用一份，避免反复读盘与切子集 */
const memoryCache = new Map<string, readonly OgFont[]>();

export async function loadOgFonts(charset: string): Promise<readonly OgFont[]> {
  const cached = memoryCache.get(charset);
  if (cached) return cached;
  const fonts = await Promise.all(OG_WEIGHTS.map((spec) => loadWeight(spec, charset)));
  memoryCache.set(charset, fonts);
  return fonts;
}

async function loadWeight(spec: { readonly weight: number; readonly file: string }, charset: string): Promise<OgFont> {
  const source = readFileSync(join(FONT_DIR, spec.file));
  const key = digest(source, charset);
  const file = join(CACHE_DIR, `og-${spec.weight}-${key}.ttf`);
  const data = existsSync(file) ? readFileSync(file) : await writeSubset(source, charset, file);
  return { name: OG_FONT_FAMILY, weight: spec.weight, data };
}

/** 子集产物：TTF（靶格式是 sfnt），写进缓存目录后返回内容 */
async function writeSubset(source: Buffer, charset: string, file: string): Promise<Buffer> {
  const subset = await subsetFont(source, charset, { targetFormat: "sfnt" });
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, subset);
  return subset;
}

/** 缓存键：原字体内容 + 字符集，任何一边变了都重切 */
function digest(source: Buffer, charset: string): string {
  return createHash("sha256").update(source).update("\u0000").update(charset).digest("hex").slice(0, 12);
}
