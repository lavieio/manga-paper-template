import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts, getPostSlug } from "../utils/posts";
import { site } from "../config";

/** RSS 2.0（plan §12）：摘要用 frontmatter description，私密/草稿天然缺席 */
export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  const lastBuild = posts[0]?.data.date ?? new Date();

  return rss({
    title: site.name,
    description: site.tagline,
    site: context.site ?? site.name,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${getPostSlug(post)}/`,
      categories: post.data.tags,
    })),
    customData: `<language>zh-cn</language><lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>`,
  });
}
