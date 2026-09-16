import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 构建配置期/验收脚本扫描内容目录，收集私密与草稿文章。
 * sitemap 的 filter 是同步函数、拿不到内容集合，因此在 config 阶段直接读文件。
 */
const CONTENT_DIR = "src/content/blog";

export interface HiddenPost {
  slug: string;
  title: string;
  description: string;
  isPrivate: boolean;
  isDraft: boolean;
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function frontmatterOf(file: string): string | null {
  const match = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function field(frontmatter: string, name: string): string {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

/** 所有 private: true 或 draft: true 的文章（含标题/摘要，供产物断言使用） */
export function collectHiddenPosts(contentDir: string = CONTENT_DIR): HiddenPost[] {
  const posts: HiddenPost[] = [];
  for (const file of walkMarkdown(contentDir)) {
    const frontmatter = frontmatterOf(file);
    if (!frontmatter) continue;
    const isPrivate = /^private:\s*true\s*$/m.test(frontmatter);
    const isDraft = /^draft:\s*true\s*$/m.test(frontmatter);
    if (!isPrivate && !isDraft) continue;
    posts.push({
      slug: file.split(/[\\/]/).pop()!.replace(/\.md$/, ""),
      title: field(frontmatter, "title"),
      description: field(frontmatter, "description"),
      isPrivate,
      isDraft,
    });
  }
  return posts;
}

/** 仅 slug 列表（sitemap filter 用） */
export function collectHiddenSlugs(contentDir: string = CONTENT_DIR): string[] {
  return collectHiddenPosts(contentDir).map((post) => post.slug);
}

/** 内容目录里的全部 Markdown 数量（含隐藏），用于校验索引页数 */
export function countAllPosts(contentDir: string = CONTENT_DIR): number {
  return walkMarkdown(contentDir).length;
}
