/**
 * 站点默认卡片 `/og/default.png`：首页、归档、标签、分页、私密页等所有没有专属卡片的页面共用。
 *
 * 走路由而不是提交一张静态 PNG：站点名 / 简介 / 域名改了，这张图跟着改，
 * 不会像静态文件那样悄悄过期。字体与 `/og/[slug].png` 共用同一份子集。
 */
import type { APIRoute } from "astro";
import { siteCard, siteCards } from "../../utils/og-card";
import { prepareOgFonts, renderOgImage } from "../../utils/og-image";
import { ogHost } from "../../utils/share-image";

export const GET: APIRoute = async ({ site }) => {
  const host = ogHost(site);
  const fonts = await prepareOgFonts(await siteCards(host));
  const png = await renderOgImage(siteCard(host), fonts);
  return new Response(png, { headers: { "content-type": "image/png" } });
};
