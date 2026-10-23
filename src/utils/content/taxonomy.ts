import { getCategory, type DatedPost } from "./posts";

export interface CategorySummary {
  readonly name: string;
  readonly count: number;
  /** 该分类下最新的一篇；传入的 posts 已按日期倒序 */
  readonly latest: DatedPost;
}

export interface TagSummary {
  readonly name: string;
  readonly count: number;
}

/** 分类汇总：按文章数倒序，同数量按中文名称排序 */
export function summarizeCategories(posts: readonly DatedPost[]): readonly CategorySummary[] {
  const groups = new Map<string, DatedPost[]>();
  for (const post of posts) {
    const name = getCategory(post);
    const group = groups.get(name);
    if (group) group.push(post);
    else groups.set(name, [post]);
  }

  return [...groups.entries()]
    .flatMap(([name, items]) => {
      const latest = items[0];
      return latest ? [{ name, count: items.length, latest }] : [];
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

/** 标签汇总：按出现次数倒序，同数量按中文名称排序 */
export function summarizeTags(posts: readonly DatedPost[]): readonly TagSummary[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"));
}
