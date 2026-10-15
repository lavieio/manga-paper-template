/**
 * MangaPaper 站点配置 —— 使用者唯一需要改的文件。
 *
 * 改站点名、作者、一句话简介、社交入口、分页篇数，都在这里。
 * 部署期与密钥类的配置不走这里，走 `.env`（见 `.env.example` 与 README 的环境变量表）。
 * 「关于」页的正文是内容不是配置，在 `src/content/pages/about.md` 里。
 *
 * 字段说明见 `src/types/config.ts`；这里只写值。
 */
import { defineConfig } from "./src/types/config";

export default defineConfig({
  site: {
    name: "MangaPaper",
    tagline: "A loose-leaf, comic-paper, monospace blog theme",
    author: "lavie",
    /** 一句话简介：关于页 meta description 的兜底，也是站点默认分享卡的第二行 */
    bio: "漫画稿纸风格的开源博客模板",
  },

  posts: {
    /** 列表分页每页篇数 */
    perPage: 8,
    /** 首页「最近更新」条数 */
    recentCount: 3,
  },

  /**
   * 你的入口列表：首页贴纸条与关于页的联系入口都用它，顺序即展示顺序。
   * RSS 与私密文章由模板固定追加，不用写在这里。
   *
   * `icon` 三种写法都认：
   *   内置名       "github" / "x" / "weibo" / "mail" / "rss" …（清单见 src/utils/social/links.ts）
   *   站内图片     "/icons/weibo.svg"（文件放 public/icons/ 下）
   *   外链图片     "https://example.com/icon.png"
   */
  socials: [
    {
      label: "GitHub",
      url: "https://github.com/lavieio/manga-paper-template",
      icon: "github",
      /** 主入口：墨底纸字。一条里最多给一个 */
      // primary: true,
    },
    { label: "邮箱",    url: "mailto:yww130825@gmail.com", icon: "mail" },
    { label: "X", url: "https://x.com/lavie2048", icon: "x" }
  ],
});
