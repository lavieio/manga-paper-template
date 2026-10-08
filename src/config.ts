import { parseGaMeasurementId } from "./utils/analytics";
import { isEnabledFlag } from "./utils/env-flag";

/** 站点全局配置：唯一入口。占位值随时可改。 */
export const site = {
  name: "MangaPaper",
  tagline: "A loose-leaf, comic-paper, monospace blog theme",
  author: "lavie",
  /** 关于页作者卡上的一句话简介（同时用作该页 meta description） */
  bio: "漫画稿纸风格的开源博客模板",
  /** 关于页正文段落，一段一个字符串 */
  about: [
    "MangaPaper 是一个用 Astro 7 写的纯静态博客模板，设计语言是「漫画稿纸」：点阵纸底、墨色硬边框、单边硬阴影、随手贴上去的彩色贴纸，全站等宽字体，明暗双主题。零后端、零前端框架，构建出来的就是能直接丢到 Cloudflare Pages 或 Vercel 的静态站点，搜索、归档、标签、分类、分页、sitemap、RSS 全在构建期生成。内容用 Markdown 写，一级目录名即分类、文件名即 URL，日期由 git 钩子自动注入；私密文章在构建期用 AES-256-GCM 加密、页面上只留密文，密码在你的浏览器本地解密；评论走可选的 remark42，未配置就整块不渲染。",
  ],
  /** 关于页联系邮箱；留空则不渲染该入口 */
  email: "" as string,
  /** 页脚 GitHub 链接（模板源码地址）；置空则不渲染该入口 */
  repo: "https://github.com/lavieio/manga-paper-template",
} as const;

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

export type SiteConfig = typeof site;
