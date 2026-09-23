/** 站点全局配置：唯一入口（plan §2）。占位值随时可改。 */
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
 * remark42 评论（plan §11）：全部从 env 读取，不设硬编码占位。
 * 未配置时整个评论区不渲染（而非显示空壳）。
 */
export const remark42 = {
  host: import.meta.env.PUBLIC_REMARK42_HOST as string | undefined,
  siteId: import.meta.env.PUBLIC_REMARK42_SITE_ID as string | undefined,
} as const;

export const isRemark42Enabled = Boolean(remark42.host && remark42.siteId);

export type SiteConfig = typeof site;
