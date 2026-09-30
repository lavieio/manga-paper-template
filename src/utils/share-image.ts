/**
 * 分享图（og:image / twitter:image）的取值规则，唯一来源：
 * frontmatter `cover` > 动态卡片 `/og/<slug>.png` > 站点默认卡片 `/og/default.png`。
 *
 * 三条硬规则：
 * - **私密文章一律用默认卡片**：`/og/<slug>.png` 的路径可猜，等于把标题摆进公开目录；
 * - **站内 cover 必须真实存在**（拼错就在构建期报错，否则分享出去是一张空白图）；
 * - 返回值一律是**绝对地址**：Open Graph 不接受相对路径，平台会直接丢掉整张图。
 *
 * 入参只吃「已经归一好的文章字段」（slug / title / cover / isPrivate），不碰 astro:content，
 * 这样取值规则可以脱离 Astro 单测。
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { OG_HEIGHT, OG_WIDTH } from "./og-size.ts";

export interface ShareImage {
  /** 绝对地址（http/https） */
  readonly url: string;
  /** 尺寸已知才给：外链 cover 无从得知，这两个 meta 就不写 */
  readonly width?: number;
  readonly height?: number;
  readonly alt: string;
}

/** 站点侧字段：`siteUrl` 是 `Astro.site`（构建期 preflight 保证有值） */
export interface ShareSite {
  readonly siteUrl: URL | undefined;
  readonly siteName: string;
}

/** 文章侧字段：调用方负责归一（slug 由 getPostSlug() 给） */
export interface SharePost {
  readonly slug: string;
  readonly title: string;
  readonly cover?: string;
  readonly isPrivate: boolean;
}

/** 站点默认卡片：首页、归档、标签、私密页等所有没有专属卡片的页面 */
export function siteShareImage(site: ShareSite): ShareImage {
  return {
    url: new URL("/og/default.png", requireSite(site.siteUrl)).href,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    alt: `${site.siteName} 站点卡片`,
  };
}

/** 文章分享图：私密文章回落默认卡片，公开文章用 cover 或动态卡片 */
export function postShareImage(post: SharePost, site: ShareSite): ShareImage {
  if (post.isPrivate) return siteShareImage(site);
  const siteUrl = requireSite(site.siteUrl);
  if (post.cover) return coverShareImage(post.cover, siteUrl, post.title);
  return {
    url: new URL(`/og/${post.slug}.png`, siteUrl).href,
    width: OG_WIDTH,
    height: OG_HEIGHT,
    alt: post.title,
  };
}

/** 卡片右下角只写域名（不带协议） */
export function ogHost(siteUrl: URL | undefined): string {
  return requireSite(siteUrl).host;
}

function requireSite(siteUrl: URL | undefined): URL {
  if (!siteUrl) throw new Error("[share-image] 缺少 site 配置（SITE_URL 未生效），拿不到分享图的绝对地址");
  return siteUrl;
}

/** 外链 cover 原样用；站内 cover 先确认文件真在 public/ 里 */
function coverShareImage(cover: string, siteUrl: URL, alt: string): ShareImage {
  if (/^https?:\/\//.test(cover)) return { url: cover, alt };
  const path = cover.startsWith("/") ? cover : `/${cover}`;
  if (!existsSync(join(process.cwd(), "public", path))) {
    throw new Error(`[share-image] frontmatter cover 指向的文件不存在：public${path}（拼错了？或图片没放进 public/）`);
  }
  return { url: new URL(path, siteUrl).href, alt };
}
