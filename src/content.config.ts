import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * 博客内容模型。
 * 草稿可省略 date；发布文章必须有 date（钩子会注入，注入失败即报错）。
 * category 为自由字符串，不写死枚举。
 */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // 草稿允许无 date；发布文章若无 date 将在 getPublishedPosts() 报构建错误
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    // 可省略：缺省取文章所在一级子目录名（tech/ → tech）；根目录文件必须显式填写
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    private: z.boolean().default(false),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

/**
 * 单页内容（目前只有「关于」）。
 * 正文可以写 Markdown、HTML 与 `<style>`——后者由 `src/utils/content/about.ts`
 * 包进 `@scope`，裸类名漏不到页头页脚。
 */
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    /** 页面 h1（正文从 `##` 起，别再写 `#`） */
    title: z.string(),
    /** meta description；不写就回落到 site.bio */
    description: z.string().optional(),
    /** 正文是否套文章排版（`.prose`）；整页自写 CSS 时关掉 */
    prose: z.boolean().default(true),
    /** 正文下方是否显示站点统计条（文章 / 分类 / 标签数） */
    stats: z.boolean().default(true),
  }),
});

export const collections = { blog, pages };
