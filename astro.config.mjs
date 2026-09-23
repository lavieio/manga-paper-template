import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import rehypeImageSize from "./src/plugins/rehype-image-size.ts";
import rehypeCodeCopy from "./src/plugins/rehype-code-copy.ts";
import { collectHiddenSlugs } from "./src/plugins/private-slugs.ts";
import { loadEnvFiles } from "./src/utils/load-env.ts";
import { siteUrlOrPlaceholder } from "./src/utils/site-url.ts";

// Astro 文档：.env files are not loaded inside configuration files。
// 不先自己加载一遍，下面 process.env.SITE_URL 就永远读不到 .env 里的值，
// site 会静静落回占位域名（canonical / sitemap / RSS 全跟着错）。
loadEnvFiles();

// sitemap 排除项：私密/草稿文章、noindex 的 /private
const hiddenSlugs = collectHiddenSlugs();
const SITEMAP_EXCLUDED = ["/private", "/search"];

export default defineConfig({
  output: "static",
  // 唯一真源 env SITE_URL（canonical / sitemap / RSS）。
  // 没配就用占位域名兜底（dev / preview 照常跑）；
  // 拒绝占位域名的构建前检查在 scripts/preflight.ts，挂在 npm run build 链上。
  site: siteUrlOrPlaceholder(process.env.SITE_URL),
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
  build: {
    // 页面级 CSS 未压缩仅 6 KB 上下，默认 'auto' 的 4 KB 阈值不会内联，
    // 两个 <link rel="stylesheet"> 因此成为渲染阻塞请求；一律内联消掉这两个 RTT。
    inlineStylesheets: "always",
  },
  markdown: {
    // Astro 7 默认 Sätteri；rehype 插件需声明 unified 处理器（官方回退路径）
    processor: unified({ rehypePlugins: [rehypeImageSize, rehypeCodeCopy] }),
    shikiConfig: {
      // 暗色用 github-dark-default：dimmed 的注释色 #768390 在 #22272e 上只有 3.88:1，
      // 低于 AA（老版 github-dark 更差，3.05）；default 的注释是 6.15:1。
      // 代价是代码块底色由 #22272e 换成 #0d1117、配色整体更亮一些。
      themes: { light: "github-light", dark: "github-dark-default" },
    },
  },
});
