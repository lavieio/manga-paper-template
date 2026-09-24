import type { APIContext } from "astro";

/**
 * robots.txt：`Sitemap:` 行必须写真实域名，而域名唯一真源是构建期的 SITE_URL，
 * 所以由路由生成而不是放 public/——静态文件跟不了 SITE_URL，
 * 使用者改域名时就得记得手动同步，忘一次就是一份指向别处的 sitemap 声明。
 */
export function GET({ site }: APIContext): Response {
  if (!site) throw new Error("[robots] 缺少 site 配置，SITE_URL 未生效，无法生成 robots.txt");

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("sitemap-index.xml", site).href}`,
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
