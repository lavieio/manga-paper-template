/** 站点全局配置：唯一入口（plan §2）。占位值随时可改。 */
export const site = {
  name: "MangaPaper",
  tagline: "A loose-leaf, comic-paper, monospace blog theme",
  author: "MangaPaper",
  /** 关于页作者卡上的一句话简介（同时用作该页 meta description） */
  bio: "漫画稿纸风格的开源博客模板",
  /** 关于页正文段落，一段一个字符串 */
  about: [
    "MangaPaper 是纯静态的 Astro 博客模板：点阵纸底、墨色硬边框、单边硬阴影、随手贴的彩色贴纸，全站等宽字体，明暗双主题，零后端、零前端框架。",
    "这页是写给站点主的：改 src/config.ts 里的 bio 与 about 就能换成你自己的介绍，不需要动页面代码。",
  ],
  /** 关于页联系邮箱；留空则不渲染该入口 */
  email: "" as string,
  /** 页脚 GitHub 链接（模板源码地址）；置空则不渲染该入口 */
  repo: "https://github.com/lavieio/manga-paper-template",
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
