/**
 * 内部已解析配置：把仓根 `manga-paper.config.ts`（使用者唯一入口）套上默认值后的固定形状。
 *
 * 消费方一律从这里 import，不直接读用户配置——将来加默认值 / 校验只改这一处。
 * env 驱动的可选能力（remark42 / GA4 / Vercel 观测）也在这里合并：它们是部署期与密钥，
 * 不进仓里的配置文件。
 */
import userConfig from "../manga-paper.config";
import { resolveCategoryColors } from "./utils/content/category";
import { parseGaMeasurementId } from "./utils/env/analytics";
import { isEnabledFlag } from "./utils/env/env-flag";
import { resolveSiteConfig, type ResolvedSiteConfig } from "./utils/site/identity";
import { RSS_SOCIAL, resolveSocials } from "./utils/social/links";

/** 站点身份与文案：换站只改 manga-paper.config.ts 的 site；默认值与校验在 resolveSiteConfig */
export const site: ResolvedSiteConfig = resolveSiteConfig(userConfig.site);

/** 内容组织：列表分页篇数与首页「最近更新」条数 */
export const posts = { ...userConfig.posts } as const;

/** 分类贴纸色覆盖：未列出的分类由 categoryColor() 按名称稳定取色 */
export const categoryColors = resolveCategoryColors(userConfig.categories?.colors);

/**
 * 首页贴纸条的入口：socials + 固定的 RSS。
 * 固定项放在末尾，于是 socials 里的下标与报错里的「第 N 条」一致。
 */
export const homeSocials = resolveSocials([...userConfig.socials, RSS_SOCIAL]);

/**
 * remark42 评论：全部从 env 读取，不设硬编码占位。
 * 未配置时整个评论区不渲染（而非显示空壳）。
 */
export const remark42 = {
  host: import.meta.env.PUBLIC_REMARK42_HOST as string | undefined,
  siteId: import.meta.env.PUBLIC_REMARK42_SITE_ID as string | undefined,
} as const;

export const isRemark42Enabled = Boolean(remark42.host && remark42.siteId);

/**
 * 访问统计（GA4）与搜索引擎验证（GSC）：全部从 env 读取，不设硬编码占位。
 * 两项都是可选的，未配置就整块不渲染，也不会写进 CSP。
 */
export const analytics = {
  /** GA4 Measurement ID（`PUBLIC_`，客户端可见）；未配置或格式非法一律视为未启用 */
  gaMeasurementId: parseGaMeasurementId(import.meta.env.PUBLIC_GA_MEASUREMENT_ID as string | undefined),
  /** GSC 的 HTML 标记验证 token（也可改用 DNS TXT 验证，那样无需本项） */
  gscVerification: (import.meta.env.PUBLIC_GSC_VERIFICATION as string | undefined)?.trim() || null,
} as const;

export const isAnalyticsEnabled = analytics.gaMeasurementId !== null;

/**
 * Vercel 平台原生观测（可选，仅 Vercel 部署可用）：Web Analytics + Speed Insights。
 * `onVercel` 不是用户配置项——由 `astro.config.mjs` 按构建环境的 `VERCEL=1` 注入，
 * 因此非 Vercel 平台（如 Cloudflare Pages）即使误设开关也不会输出 404 的 `/_vercel/*` 引用。
 */
export const vercelObservability = {
  /** Web Analytics：访问量 / 来源 / 页面，无 cookie、匿名 */
  analytics: isEnabledFlag(import.meta.env.PUBLIC_VERCEL_ANALYTICS as string | undefined),
  /** Speed Insights：真实用户 Core Web Vitals */
  speedInsights: isEnabledFlag(import.meta.env.PUBLIC_VERCEL_SPEED_INSIGHTS as string | undefined),
  /** 当前构建是否跑在 Vercel 上（构建期注入，不是用户配置） */
  onVercel: isEnabledFlag(import.meta.env.PUBLIC_ON_VERCEL as string | undefined),
} as const;

export const isVercelAnalyticsEnabled = vercelObservability.analytics && vercelObservability.onVercel;
export const isVercelSpeedInsightsEnabled = vercelObservability.speedInsights && vercelObservability.onVercel;
export const isVercelInsightsEnabled = isVercelAnalyticsEnabled || isVercelSpeedInsightsEnabled;

export type SiteConfig = ResolvedSiteConfig;
