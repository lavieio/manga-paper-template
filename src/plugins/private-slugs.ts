import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 构建配置期扫描内容目录，收集私密/草稿文章 slug。
 * sitemap 的 filter 是同步函数、拿不到内容集合，因此在 config 阶段直接读文件。
 */
const CONTENT_DIR = "src/content/blog";

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

/** 返回所有 private: true 或 draft: true 的 slug（= 文件名主体） */
export function collectHiddenSlugs(contentDir: string = CONTENT_DIR): string[] {
  return walkMarkdown(contentDir)
    .filter((file) => {
      const frontmatter = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatter) return false;
      return /^(private|draft):\s*true\s*$/m.test(frontmatter[1]);
    })
    .map((file) => file.split(/[\\/]/).pop()!.replace(/\.md$/, ""));
}
