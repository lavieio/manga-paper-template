/**
 * OG 卡片的版式常量与数据装配。
 *
 * `LAYOUT` 是版式的唯一来源：所有数字都是 1200×630 画布上的绝对坐标，
 * 改视觉只改这里，渲染代码里不要再写一套数字。
 */
import { site } from "../config";
import { formatDate } from "./format";
import { getCategory, getPostSlug, getPublishedPosts, type DatedPost } from "./posts";
import { estimateReadTime } from "./readtime";

/**
 * 卡片配色：能对上站点 token 的用 token 的值（global.css 是唯一来源），
 * 对不上的（窗口三点、荧光条、点阵）直接写在这里。
 */
export const COLOR = {
  paper: "#f7f2e7",
  card: "#fffdf6",
  ink: "#1c1913",
  body: "#2b2620",
  inkSoft: "#6d6355",
  red: "#b5342e",
  onRed: "#fffdf6",
  yellow: "#f6d34e",
  /** 标题荧光条：比贴纸黄浅一档 */
  mark: "#fae879",
  /** 点阵：墨色 ≈30% 压在纸上（比页面正文底的点阵更显眼） */
  dot: "#b9b5a9",
  winRed: "#e75b4f",
  winYellow: "#f4c04c",
  winGreen: "#58c369",
} as const;

/** 纸底点阵：间距与半径 */
export const GRID = 22;
export const DOT_RADIUS = 2;

/** 版式坐标：全部是 1200×630 画布上的绝对值 */
export const LAYOUT = {
  card: { x: 64, y: 165, w: 1073, h: 335, border: 4, shadow: 8, rotate: -0.15 },
  /** 顶栏：高度、三个窗口点、假文件名的左缘 */
  bar: { h: 58, dotsLeft: 21, dot: 24, dotGap: 13, labelLeft: 150, labelSize: 24, labelLetterSpacing: 0.5 },
  logo: { x: 84, y: 58.6, w: 64, h: 70, border: 3.5, rotate: -5.6, mSize: 48 },
  wordmark: { x: 175, y: 67.8, size: 54, letterSpacing: -0.5 },
  badge: { x: 996, y: 68.5, w: 145, h: 60, border: 3.5, rotate: -2.3, size: 33, letterSpacing: 2 },
  /** 标题荧光条：宽度跟着标题走，左右各留一点余量 */
  mark: { x: 93.8, y: 266.8, maxWidth: 896, padLeft: 25.5, padRight: 23.2, h: 66.8, rotate: -1.4 },
  title: { x: 118, y: 271.3, size: 56, letterSpacing: 0.5, maxWidth: 848 },
  desc: { x: 110, y: 376.2, size: 27, lineHeight: 40, maxWidth: 830 },
  /** 右下角手写短语：绕块中心旋转 */
  phrase: {
    center: { x: 1062.5, y: 405 },
    size: 16,
    lineHeight: 21,
    rotate: -20,
    lines: ["Better", "Code", "Better Life"],
  },
  /** 页脚：条目与分隔点的固定槽位（条目间距不等距，所以逐项写死 x） */
  footer: { y: 544, size: 24, letterSpacing: 0.5, itemX: [89, 241, 480], dotX: [202.7, 443.3], dotSize: 5, dotOffsetY: 9 },
  /** 右下角域名 */
  url: { x: 900 },
} as const;

/** 卡片内容区原点：border-box 下绝对定位子元素从 padding box 起算 */
export const CARD_ORIGIN = { x: LAYOUT.card.x + LAYOUT.card.border, y: LAYOUT.card.y + LAYOUT.card.border };

/** 一张卡片要渲染的全部文本（页脚条目最多三条，多余的不渲染） */
export interface OgCard {
  /** 顶栏「代码窗」里的假文件名，如 `posts/git-flow.md` */
  readonly label: string;
  readonly title: string;
  readonly description: string;
  /** 右上角贴纸上的分类 */
  readonly badge: string;
  /** 页脚左侧条目，按「·」分隔 */
  readonly meta: readonly string[];
  /** 右下角域名（不含协议） */
  readonly host: string;
}

/**
 * 裁好之后的卡片度量：装饰要跟着标题走——标题短的时候光芒线与下划线不能离它很远。
 * 标题的裁剪只做一次，树与装饰共用这份结果。
 */
export interface OgGeometry {
  readonly title: string;
  readonly description: string;
  /** 标题的推进宽度（px） */
  readonly titleWidth: number;
  /** 荧光条右缘的 x（标题光芒线挂在它右边） */
  readonly markRight: number;
}

/** 文章卡片：公开文章才有（私密/草稿的标题不能出现在图里） */
export function postCard(post: DatedPost, host: string): OgCard {
  return {
    label: `posts/${getPostSlug(post)}.md`,
    title: post.data.title,
    description: post.data.description,
    badge: getCategory(post),
    meta: [site.author, formatDate(post.data.date), `${estimateReadTime(post.body ?? "")} 分钟阅读`],
    host,
  };
}

/** 站点卡片：首页、归档、标签、私密页等没有专属卡片的页面都用它 */
export function siteCard(host: string): OgCard {
  return {
    label: "README.md",
    title: site.name,
    description: site.about[0],
    badge: "博客",
    meta: [site.author, site.bio],
    host,
  };
}

/**
 * 站点级字符集来源：全部公开文章的卡片 + 站点卡片。
 * 两张路由（`/og/[slug].png` 与 `/og/default.png`）都按这一份切字体子集，
 * 于是同一个构建里只切一次、共用同一份缓存。
 */
export async function siteCards(host: string): Promise<readonly OgCard[]> {
  const posts = await getPublishedPosts();
  return [...posts.map((post) => postCard(post, host)), siteCard(host)];
}
