import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import rehypeImageSize from "./src/plugins/rehype-image-size.ts";
import rehypeCodeCopy from "./src/plugins/rehype-code-copy.ts";
import { collectHiddenSlugs } from "./src/plugins/private-slugs.ts";

// 站点根 URL 唯一真源是 env SITE_URL；占位值仅兜底，上线前必须配置。
// 驱动 canonical URL / sitemap / RSS 链接。
const SITE = process.env.SITE_URL ?? "https://your-domain.com";

// sitemap 排除项：私密/草稿文章、noindex 的 /private
const hiddenSlugs = collectHiddenSlugs();
const SITEMAP_EXCLUDED = ["/private", "/search"];

export default defineConfig({
  output: "static",
  site: SITE,
  integrations: [
    sitemap({
      filter: (page) => {
        // 路径是百分号编码的（中文 slug），需解码后再与文件名比较
        const encoded = new URL(page).pathname.replace(/\/$/, "");
        let path = encoded;
        try {
          path = decodeURIComponent(encoded);
        } catch {
          /* 保留原值 */
        }
        if (SITEMAP_EXCLUDED.includes(path)) return false;
        return !hiddenSlugs.some((slug) => path === `/posts/${slug}`);
      },
    }),
  ],
  markdown: {
    // Astro 7 默认 Sätteri；rehype 插件需声明 unified 处理器（官方回退路径）
    processor: unified({ rehypePlugins: [rehypeImageSize, rehypeCodeCopy] }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark-dimmed" },
    },
  },
});
