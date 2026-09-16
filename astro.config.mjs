import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeImageSize from "./src/plugins/rehype-image-size.ts";

// 站点根 URL 唯一真源是 env SITE_URL；占位值仅兜底，上线前必须配置。
// 驱动 canonical URL / sitemap / RSS 链接。
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "https://your-domain.com",
  markdown: {
    // Astro 7 默认 Sätteri；rehype 插件需声明 unified 处理器（官方回退路径）
    processor: unified({ rehypePlugins: [rehypeImageSize] }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark-dimmed" },
    },
  },
});
