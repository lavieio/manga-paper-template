/**
 * 注入到 SVG 层的两样东西——Satori 画不出来，只能在它吐出的 SVG 上补：
 *
 * 1. **纸底点阵**：Satori 把 `radial-gradient` 编译成自己的 pattern，resvg 渲染不出来 → 换成 `<pattern>`；
 * 2. **手绘装饰**：光芒线、标题双下划线、右下角箭头与下划线、页脚弯箭头。
 *
 * 位置都是 1200×630 画布上的绝对坐标；「挂在标题右边/下面」的那几条用 `OgGeometry`
 * 的度量，标题短的时候会跟着收（否则会跟标题隔一大段空白、或超出标题范围）。
 */
import { COLOR, DOT_RADIUS, GRID, LAYOUT, type OgGeometry } from "./og-card";
import { OG_HEIGHT, OG_WIDTH } from "./og-size.ts";
import { brushStroke, handStroke, type Point } from "./og-stroke";

/** 纸底矩形：Satori 会把根节点背景吐成这一行，用它定位点阵的插入点 */
export const PAPER_RECT = new RegExp(`<rect[^>]*fill="${COLOR.paper}"[^>]*/>`);

export function dotLayer(): string {
  return [
    `<pattern id="og-dots" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse">`,
    `<circle cx="${GRID / 2}" cy="${GRID / 2}" r="${DOT_RADIUS}" fill="${COLOR.dot}"/>`,
    "</pattern>",
    `<rect x="0" y="0" width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#og-dots)"/>`,
  ].join("");
}

/** 箭头笔触的手抖与倒刺抖动：比其它装饰小，弧线与指向要看得清（其它装饰默认 0.9 / 0.6） */
const ARROW_WOBBLE = 0.3;
const ARROW_BARB_AMP = 0.25;

const outline = (d: string, color: string, width: number): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;

const filled = (d: string, color: string): string => `<path d="${d}" fill="${color}"/>`;

/** 左上 logo 左侧的三条放射线（上→右下、中→右下微降、下→右上） */
function logoRays(): readonly string[] {
  return [
    outline(handStroke([42.3, 50.3], [58.9, 62.4], { seed: 11, amp: 1.2 }), COLOR.ink, 2.6),
    outline(handStroke([33.3, 82.5], [57.5, 84.6], { seed: 12, amp: 1.1 }), COLOR.ink, 2.6),
    outline(handStroke([37.4, 117.9], [56.8, 105], { seed: 13, amp: 1.2 }), COLOR.ink, 2.6),
  ];
}

/** 徽章右侧的两条光芒线 */
function badgeRays(): readonly string[] {
  return [
    outline(handStroke([1157.3, 68], [1168.4, 54.8], { seed: 21, amp: 1 }), COLOR.ink, 2.4),
    outline(handStroke([1160.8, 86], [1173.3, 77], { seed: 22, amp: 1 }), COLOR.ink, 2.4),
  ];
}

/** 标题右侧三条光芒线：相对荧光条右缘的偏移 */
const TITLE_RAYS: readonly { readonly from: Point; readonly to: Point; readonly seed: number }[] = [
  { from: [5, 272], to: [18, 252], seed: 41 },
  { from: [14, 283], to: [34, 269], seed: 42 },
  { from: [19, 298.3], to: [39, 295.3], seed: 43 },
];

/** 标题下划线：相对标题宽度的小数位置（两条合起来盖住标题左侧约 55%） */
const TITLE_UNDERLINE: readonly {
  readonly from: number;
  readonly to: number;
  readonly y0: number;
  readonly y1: number;
  readonly seed: number;
  readonly width: number;
  readonly sag: number;
}[] = [
  { from: 0.05, to: 0.415, y0: 363, y1: 348, seed: 31, width: 2.8, sag: -2 },
  { from: 0.432, to: 0.591, y0: 361, y1: 356.5, seed: 32, width: 2.4, sag: -1.2 },
];

/** 挂在标题上的装饰：右侧光芒线 + 下方双下划线 */
function titleDecorations(geometry: OgGeometry): readonly string[] {
  const rays = TITLE_RAYS.map(({ from, to, seed }) =>
    outline(
      handStroke([geometry.markRight + from[0], from[1]], [geometry.markRight + to[0], to[1]], { seed, amp: 1.1 }),
      COLOR.ink,
      2.4,
    ),
  );
  const underlines = TITLE_UNDERLINE.map(({ from, to, y0, y1, seed, width, sag }) =>
    filled(
      brushStroke(
        [LAYOUT.title.x + from * geometry.titleWidth, y0],
        [LAYOUT.title.x + to * geometry.titleWidth, y1],
        { seed, sag, width },
      ),
      COLOR.ink,
    ),
  );
  return [...rays, ...underlines];
}

/**
 * 右下角短语旁的箭头：笔尖朝左下（指向标题与摘要），箭杆从笔尖甩出一道弧。
 * 箭头这类「指向性」笔触抖小一点（`wobble`），弧线才看得清走向。
 */
function phraseDecorations(): readonly string[] {
  const arrow = { wobble: ARROW_WOBBLE, taper: 0.35 };
  return [
    filled(brushStroke([953, 448], [1014, 448], { ...arrow, seed: 51, controls: [[985, 461]], width: 2 }), COLOR.inkSoft),
    outline(handStroke([967, 442], [949, 444.5], { seed: 52, amp: ARROW_BARB_AMP }), COLOR.inkSoft, 2),
    outline(handStroke([949, 444.5], [956, 459], { seed: 53, amp: ARROW_BARB_AMP }), COLOR.inkSoft, 2),
    // 短语末行下方的手绘线（与文字同角度 −20°）
    filled(brushStroke([1026, 461], [1121, 425], { seed: 81, width: 1.9, taper: 0.55 }), COLOR.inkSoft),
  ];
}

/** 页脚：左侧向上弯的手绘箭头 + 作者名与域名下的手绘线 + 域名右上角光芒 */
function footerDecorations(): readonly string[] {
  // 箭头朝上：宽开口的 V 形箭头 + 箭杆正对 V 的中心（两笔在笔尖相交，不叠在一起）
  const tip: Point = [53, 523.5];
  return [
    outline(handStroke(tip, [43.5, 535], { seed: 63, amp: ARROW_BARB_AMP }), COLOR.ink, 2.4),
    outline(handStroke(tip, [63, 534.5], { seed: 64, amp: ARROW_BARB_AMP }), COLOR.ink, 2.4),
    filled(
      brushStroke([52.5, 527], [66, 575], {
        seed: 61,
        controls: [[50, 542], [53, 570]],
        width: 2.4,
        taper: 0.35,
        wobble: ARROW_WOBBLE,
      }),
      COLOR.ink,
    ),
    filled(brushStroke([90, 578.5], [162, 573.5], { seed: 71, sag: 1.4, width: 2.8, taper: 0.55 }), COLOR.ink),
    // 网址后半段下划线：右端渐渐放平
    filled(brushStroke([989, 584], [1140, 574.5], { seed: 72, controls: [[1040, 579]], width: 2.6 }), COLOR.ink),
    outline(handStroke([1149.4, 541.5], [1157.7, 530.4], { seed: 73, amp: 1 }), COLOR.ink, 2.2),
    outline(handStroke([1152.9, 556.7], [1164, 547.7], { seed: 74, amp: 1 }), COLOR.ink, 2.2),
  ];
}

/** 全部手绘装饰（画在卡片之上的 SVG 片段） */
export function decorationLayer(geometry: OgGeometry): string {
  return [...logoRays(), ...badgeRays(), ...titleDecorations(geometry), ...phraseDecorations(), ...footerDecorations()].join("");
}
