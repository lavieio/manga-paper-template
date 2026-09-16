/** 站点全局配置：唯一入口（plan §2）。占位值随时可改。 */
export const site = {
  name: "MangaPaper",
  tagline: "A loose-leaf, comic-paper, monospace blog theme",
  author: "MangaPaper",
} as const;

/**
 * remark42 评论（plan §11）：全部从 env 读取，不设硬编码占位。
 * 未配置时整个评论区不渲染（而非显示空壳）。
 */
export const remark42 = {
  host: import.meta.env.PUBLIC_REMARK42_HOST as string | undefined,
  siteId: import.meta.env.PUBLIC_REMARK42_SITE_ID as string | undefined,
} as const;

export const isRemark42Enabled = Boolean(remark42.host && remark42.siteId);

export type SiteConfig = typeof site;
