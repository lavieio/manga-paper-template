/**
 * 站点 social 入口的**纯逻辑**：校验配置、判定图标形态、拼出渲染用的列表。
 *
 * 这里只做类型 import，没有任何运行时依赖——所以能被 `node --test` 直接跑
 * （Node 原生类型剥离不解析无扩展名的相对 import，一旦这里 import 了别的 src 模块，
 * `devtools/socials.test.ts` 就跑不起来了）。
 */
import type { Social } from "../types/config";

/**
 * 内置图标名。加名字要同时改 `src/utils/social-icons.ts`——
 * 那边是 `Record<IconName, string>`，少一条编译期就红。
 */
export const SOCIAL_ICONS = [
  "github",
  "x",
  "facebook",
  "instagram",
  "linkedin",
  "telegram",
  "youtube",
  "reddit",
  "discord",
  "mastodon",
  "bluesky",
  "threads",
  "rss",
  "weibo",
  "zhihu",
  "bilibili",
  "wechat",
  "douban",
  "juejin",
  "gitee",
  "mail",
  "link",
  "seal",
] as const;

export type IconName = (typeof SOCIAL_ICONS)[number];

/** 兜底图标：通用外链。名字不认识时用它，绝不留下一个空位 */
export const FALLBACK_ICON: IconName = "link";

/** 模板自带的固定入口：RSS 永远指向本站 feed */
export const RSS_SOCIAL: Social = { label: "RSS", url: "/rss.xml", icon: "rss" };

/**
 * 图标形态：内置名，或一张图片（站内路径 / 外链 URL）。
 * 判定只看字符串本身，见 `resolveIcon()`。
 */
export type IconSpec =
  | { readonly kind: "builtin"; readonly name: IconName }
  | { readonly kind: "image"; readonly src: string };

export interface ResolvedSocial {
  readonly label: string;
  readonly href: string;
  readonly icon: IconSpec;
  readonly primary: boolean;
  /** http(s) 外链 → 组件据此加 `target="_blank"` + `rel="noopener noreferrer"` */
  readonly external: boolean;
}

/** 需要 `target="_blank"` 的只有 http(s) 外链；mailto 与站内路径都不该开新标签 */
const EXTERNAL_PATTERN = /^https?:\/\//i;
/** 站内绝对路径、相对路径、外链 URL——都当图片看待 */
const IMAGE_PATH_PATTERN = /^(?:https?:\/\/|\/|\.\/)/i;
const IMAGE_EXTENSION_PATTERN = /\.(?:svg|png|jpe?g|webp|gif|avif)$/i;

/**
 * 图标归一，三种形态一条规则：
 * 1. 命中内置名（大小写不敏感）→ 内置 SVG；
 * 2. 像路径或带图片扩展名 → 当图片渲染；
 * 3. 其余（没写、写错、名字不存在）→ 通用外链图标。
 */
export function resolveIcon(icon?: string): IconSpec {
  const value = (icon ?? "").trim();
  if (!value) return { kind: "builtin", name: FALLBACK_ICON };

  const name = value.toLowerCase();
  if ((SOCIAL_ICONS as readonly string[]).includes(name)) {
    return { kind: "builtin", name: name as IconName };
  }

  if (IMAGE_PATH_PATTERN.test(value) || IMAGE_EXTENSION_PATTERN.test(value)) {
    return { kind: "image", src: value };
  }

  return { kind: "builtin", name: FALLBACK_ICON };
}

/**
 * 给 CSS 用的图标键：内置名直接用名字（组件按 `[data-icon="rss"]` 上色），
 * 图片统一是 `image`（图自带颜色，不需要主题覆盖）。
 */
export function iconKey(icon: IconSpec): string {
  return icon.kind === "builtin" ? icon.name : "image";
}

/** 校验一条配置并归一成渲染用的形状；`index` 只用于把错误指到具体哪一条 */
function toResolvedSocial(social: Social, index: number): ResolvedSocial {
  const label = social.label.trim();
  const url = social.url.trim();
  if (!label) throw new Error(`[socials] 第 ${index} 条缺少 label`);
  if (!url) throw new Error(`[socials] 第 ${index} 条缺少 url`);
  if (/\s/.test(url)) throw new Error(`[socials] 第 ${index} 条的 url 含空白字符：「${url}」`);

  return {
    label,
    href: url,
    icon: resolveIcon(social.icon),
    primary: social.primary ?? false,
    external: EXTERNAL_PATTERN.test(url),
  };
}

/** 顺序即配置顺序；调用方负责把固定入口（RSS / 私密）追加在末尾 */
export function resolveSocials(socials: readonly Social[]): readonly ResolvedSocial[] {
  // 报错里的「第 N 条」从 1 数起，和配置文件里从上往下数是同一个数
  return socials.map((social, index) => toResolvedSocial(social, index + 1));
}
