/**
 * OG 卡片内容的元素树（Satori 的输入）：荧光条 → 标题 → 摘要 → 右下角手写短语。
 *
 * Satori 走 Yoga 的 flex 布局，只支持 CSS 的一个子集：绝对定位 / rotate / boxShadow 都有，
 * 但没有 z-index（后画的在上）、没有 `calc`、点阵与手绘线条也画不出来——那两样在
 * `og-decoration.ts` 里注入 SVG。外围构件（顶栏/页眉/页脚）在 `og-chrome.ts`。
 */
import { CARD_ORIGIN, COLOR, LAYOUT, type OgCard, type OgGeometry } from "./og-card";
import { footer, header, topBar } from "./og-chrome";
import { node, text, type OgNode } from "./og-node";
import { OG_HEIGHT, OG_WIDTH } from "./og-size.ts";
import { advanceOf, fitLines, fitOneLine } from "./og-text";

/** 画布坐标 → 卡片内容区坐标（border-box 下绝对定位子元素从 padding box 起算） */
const inset = (x: number, y: number) => ({ left: x - CARD_ORIGIN.x, top: y - CARD_ORIGIN.y });

/** 标题荧光条：宽度跟着标题走（短标题不会拖一条空黄条） */
function markBlock(geometry: OgGeometry): OgNode {
  const { mark } = LAYOUT;
  return node("div", {
    position: "absolute",
    display: "flex",
    ...inset(mark.x, mark.y),
    width: geometry.markRight - mark.x,
    height: mark.h,
    backgroundColor: COLOR.mark,
    transform: `rotate(${mark.rotate}deg)`,
  });
}

function titleBlock(geometry: OgGeometry): OgNode {
  const { title } = LAYOUT;
  return text(
    {
      position: "absolute",
      ...inset(title.x, title.y),
      fontSize: title.size,
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: title.letterSpacing,
      whiteSpace: "nowrap",
      color: COLOR.ink,
    },
    geometry.title,
  );
}

function descBlock(geometry: OgGeometry): OgNode {
  const { desc } = LAYOUT;
  return text(
    {
      position: "absolute",
      ...inset(desc.x, desc.y),
      width: desc.maxWidth,
      fontSize: desc.size,
      fontWeight: 600,
      lineHeight: `${desc.lineHeight}px`,
      color: COLOR.body,
    },
    geometry.description,
  );
}

/** 右下角手写短语：绕块中心旋转，`Better / Code / Better Life` 三行 */
function phraseBlock(): OgNode {
  const { phrase } = LAYOUT;
  const width = Math.max(...phrase.lines.map((line) => advanceOf(line, phrase.size)));
  const height = phrase.lines.length * phrase.lineHeight;
  return node(
    "div",
    {
      position: "absolute",
      display: "flex",
      flexDirection: "column",
      left: phrase.center.x - width / 2 - CARD_ORIGIN.x,
      top: phrase.center.y - height / 2 - CARD_ORIGIN.y,
      transform: `rotate(${phrase.rotate}deg)`,
      fontSize: phrase.size,
      fontWeight: 700,
      lineHeight: `${phrase.lineHeight}px`,
      color: COLOR.inkSoft,
    },
    phrase.lines.map((line) => node("div", { display: "flex" }, line)),
  );
}

/** 卡片内部：顶栏（在 og-chrome）+ 荧光条 + 标题 + 摘要 + 短语 */
function cardInner(card: OgCard, geometry: OgGeometry): OgNode {
  const { card: box } = LAYOUT;
  return node(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      position: "absolute",
      left: 0,
      top: 0,
      width: box.w,
      height: box.h,
      boxSizing: "border-box",
    },
    [
      topBar(card),
      markBlock(geometry),
      titleBlock(geometry),
      descBlock(geometry),
      phraseBlock(),
    ],
  );
}

function cardBlock(card: OgCard, geometry: OgGeometry): OgNode {
  const box = LAYOUT.card;
  return node(
    "div",
    {
      position: "absolute",
      display: "flex",
      left: box.x,
      top: box.y,
      width: box.w,
      height: box.h,
      boxSizing: "border-box",
      backgroundColor: COLOR.card,
      border: `${box.border}px solid ${COLOR.ink}`,
      boxShadow: `${box.shadow}px ${box.shadow}px 0 ${COLOR.ink}`,
      transform: `rotate(${box.rotate}deg)`,
    },
    [cardInner(card, geometry)],
  );
}

/** 标题与摘要按宽度裁好，并算出装饰要用的度量 */
export function cardGeometry(card: OgCard): OgGeometry {
  const { mark, title, desc } = LAYOUT;
  const fittedTitle = fitOneLine(card.title, title.maxWidth, title.size, title.letterSpacing);
  const titleWidth = advanceOf(fittedTitle, title.size, title.letterSpacing);
  return {
    title: fittedTitle,
    description: fitLines(card.description, desc.maxWidth, desc.size, 0, 2),
    titleWidth,
    markRight: mark.x + Math.min(mark.maxWidth, titleWidth + mark.padLeft + mark.padRight),
  };
}

/** 卡片数据 → 元素树（标题与摘要用 cardGeometry() 的结果） */
export function buildCardTree(card: OgCard, geometry: OgGeometry): OgNode {
  return node(
    "div",
    {
      display: "flex",
      position: "relative",
      width: OG_WIDTH,
      height: OG_HEIGHT,
      backgroundColor: COLOR.paper,
    },
    [...header(card), cardBlock(card, geometry), ...footer(card)],
  );
}
