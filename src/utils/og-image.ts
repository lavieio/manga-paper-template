/**
 * OG 卡片渲染管线：Satori（flex 布局 → SVG，字形转路径）→ 注入点阵与手绘装饰 → resvg 栅格化成 PNG。
 *
 * 两个必须注意的点：
 * - **resvg 要关掉系统字体扫描**（`loadSystemFonts: false`）：Satori 已经把字形转成路径，
 *   resvg 不需要任何字体；开着的话 Windows 上单张要 2.9 s，关掉 23 ms。
 * - **点阵与手绘装饰只能注入 SVG**：Satori 的 `radial-gradient` 点阵 resvg 渲染不出来，
 *   手绘线条（光芒线、下划线、箭头）也不是它的 flex 能力范围内的事。
 */
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { OgCard, OgGeometry } from "./og-card";
import { OG_HEIGHT, OG_WIDTH } from "./og-size.ts";
import { decorationLayer, dotLayer, PAPER_RECT } from "./og-decoration";
import { loadOgFonts, type OgFont } from "./og-font";
import { collectTexts, type OgNode } from "./og-node";
import { buildCardTree, cardGeometry } from "./og-tree";
import { ogCharset } from "./og-text";

/** Satori 的入参类型来自 react（本仓库没有 React 依赖），这里只做一次结构性转换 */
type SatoriInput = Parameters<typeof satori>[0];
const toSatoriInput = (tree: OgNode): SatoriInput => tree as unknown as SatoriInput;

/**
 * 一批卡片共用一份字体：字符集按这批卡片**渲染出来的文本**算（含裁剪后的省略号），
 * 所以两张路由各自只切一次子集，之后每张卡片都复用。
 */
export async function prepareOgFonts(cards: readonly OgCard[]): Promise<readonly OgFont[]> {
  const texts = cards.flatMap((card) => collectTexts(buildCardTree(card, cardGeometry(card))));
  return loadOgFonts(ogCharset(texts));
}

/** 卡片 → 1200×630 PNG */
export async function renderOgImage(card: OgCard, fonts: readonly OgFont[]): Promise<Buffer> {
  const geometry = cardGeometry(card);
  const svg = await satori(toSatoriInput(buildCardTree(card, geometry)), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [...fonts],
  });
  return rasterize(injectLayers(svg, geometry));
}

function rasterize(svg: string): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
}

/** 点阵插在纸底之上、内容之下；手绘装饰画在整张卡片之上 */
function injectLayers(svg: string, geometry: OgGeometry): string {
  if (!PAPER_RECT.test(svg)) {
    throw new Error("[og-image] Satori 输出里找不到纸底矩形，点阵无从注入（Satori 换了输出结构？）");
  }
  const withDots = svg.replace(PAPER_RECT, (rect) => `${rect}${dotLayer()}`);
  if (!withDots.trimEnd().endsWith("</svg>")) {
    throw new Error("[og-image] Satori 输出的 SVG 结构不符合预期，装饰层无从注入");
  }
  return withDots.replace(/<\/svg>\s*$/, `${decorationLayer(geometry)}</svg>`);
}
