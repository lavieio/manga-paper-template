/**
 * 动态 OG 卡片：每篇**公开**文章在构建期渲染一张 1200×630 的 PNG。
 *
 * ⚠️ `getStaticPaths` 只列公开文章：私密/草稿绝不能生成卡片——`/og/<slug>.png` 的路径可猜，
 * 生成了就等于把标题摆进公开目录（私密页由 Base.astro 回落到站点默认卡片 `/og/default.png`）。
 *
 * 字体子集按站点级字符集切（`siteCards`），所以 16 篇文章只切一次、逐张复用。
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { postCard, siteCards } from "../../utils/og-card";
import { prepareOgFonts, renderOgImage } from "../../utils/og-image";
import { getPostSlug, getPublishedPosts, type DatedPost } from "../../utils/posts";
import { ogHost } from "../../utils/share-image";

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ params: { slug: getPostSlug(post) }, props: { post } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: DatedPost }, { slug: string }> = async ({ props, site }) => {
  const host = ogHost(site);
  const fonts = await prepareOgFonts(await siteCards(host));
  const png = await renderOgImage(postCard(props.post, host), fonts);
  return new Response(png, { headers: { "content-type": "image/png" } });
};
