/**
 * 卡片外围的界面构件：顶栏（三个窗口点 + 假文件名）、页眉（朱砂 logo + 站名 + 分类贴纸）、
 * 页脚（作者 · 日期 · 时长 + 右下角域名）。内容部分在 `og-tree.ts`。
 */
import { COLOR, LAYOUT, type OgCard } from "./og-card";
import { node, text, type OgNode } from "./og-node";
import { fitOneLine } from "./og-text";

/** 顶栏：文件名按可用宽度裁剪，短标题的卡片也不会把字挤出卡片 */
export function topBar(card: OgCard): OgNode {
  const { bar, card: box } = LAYOUT;
  const dotsWidth = bar.dot * 3 + bar.dotGap * 2;
  const labelMax = box.x + box.w - box.border - 20 - (box.x + bar.labelLeft);
  return node(
    "div",
    {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
      height: bar.h,
      borderBottom: `${box.border}px solid ${COLOR.ink}`,
      flexShrink: 0,
    },
    [
      node(
        "div",
        { display: "flex", gap: bar.dotGap, marginLeft: bar.dotsLeft },
        [COLOR.winRed, COLOR.winYellow, COLOR.winGreen].map((color) => windowDot(color)),
      ),
      text(
        {
          marginLeft: bar.labelLeft - bar.dotsLeft - dotsWidth,
          fontSize: bar.labelSize,
          lineHeight: 1,
          letterSpacing: bar.labelLetterSpacing,
          color: COLOR.ink,
        },
        fitOneLine(card.label, labelMax, bar.labelSize, bar.labelLetterSpacing),
      ),
    ],
  );
}

function windowDot(color: string): OgNode {
  const { dot } = LAYOUT.bar;
  return node("div", {
    boxSizing: "border-box",
    width: dot,
    height: dot,
    borderRadius: 99,
    backgroundColor: color,
    border: `2px solid ${COLOR.ink}`,
  });
}

/** 贴纸：绝对定位 + 硬边框 + 轻微旋转（手贴上去的感觉） */
function sticker(style: OgNode["props"]["style"], content: OgNode | string): OgNode {
  return node(
    "div",
    {
      position: "absolute",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      ...style,
    },
    content,
  );
}

/** 页眉：logo（朱砂方块 + 白色 M）、站名、右上角分类贴纸 */
export function header(card: OgCard): readonly OgNode[] {
  const { logo, wordmark, badge } = LAYOUT;
  return [
    sticker(
      {
        left: logo.x,
        top: logo.y,
        width: logo.w,
        height: logo.h,
        backgroundColor: COLOR.red,
        border: `${logo.border}px solid ${COLOR.ink}`,
        transform: `rotate(${logo.rotate}deg)`,
      },
      text({ fontSize: logo.mSize, fontWeight: 700, lineHeight: 1, color: COLOR.onRed }, "M"),
    ),
    text(
      {
        position: "absolute",
        left: wordmark.x,
        top: wordmark.y,
        fontSize: wordmark.size,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: wordmark.letterSpacing,
        color: COLOR.ink,
      },
      "MangaPaper",
    ),
    sticker(
      {
        left: badge.x,
        top: badge.y,
        width: badge.w,
        height: badge.h,
        backgroundColor: COLOR.yellow,
        border: `${badge.border}px solid ${COLOR.ink}`,
        transform: `rotate(${badge.rotate}deg)`,
      },
      text(
        {
          fontSize: badge.size,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: badge.letterSpacing,
          color: COLOR.ink,
        },
        card.badge,
      ),
    ),
  ];
}

/** 页脚：条目按固定槽位摆（条目间距不等距），少于三个就少画几个点 */
export function footer(card: OgCard): readonly OgNode[] {
  const { footer: bar, url } = LAYOUT;
  const base = {
    position: "absolute",
    top: bar.y,
    fontSize: bar.size,
    lineHeight: 1,
    letterSpacing: bar.letterSpacing,
    color: COLOR.ink,
  };
  const items: OgNode[] = [];
  card.meta.slice(0, bar.itemX.length).forEach((value, index) => {
    items.push(text({ ...base, left: bar.itemX[index], fontWeight: index === 0 ? 700 : 400 }, value));
    if (index > 0) items.push(separator(bar.dotX[index - 1]));
  });
  items.push(text({ ...base, left: url.x, fontWeight: 700 }, card.host));
  return items;
}

function separator(x: number): OgNode {
  const { footer: bar } = LAYOUT;
  return node("div", {
    position: "absolute",
    display: "flex",
    left: x,
    top: bar.y + bar.dotOffsetY,
    width: bar.dotSize,
    height: bar.dotSize,
    borderRadius: 99,
    backgroundColor: COLOR.ink,
  });
}
