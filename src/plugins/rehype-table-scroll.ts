/**
 * 构建期给正文里的每张表格套一层可横向滚动的容器。
 *
 * 起因：移动端（320–412px）正文栏只有 264–356px，6 列表格的最小宽度约 385px，
 * 表格右边被 `html, body { overflow-x: clip }` 直接裁掉，而且没法滚——最后那一列永远看不到。
 *
 * 为什么不直接在 CSS 里给 `table` 加 `overflow-x`：
 * - `overflow` 对 `display: table` 的元素不生效，改成 `display: block` 又会把表格布局一起改掉；
 * - 滚动区域必须能被键盘聚焦（WCAG 2.1.1，axe 的 `scrollable-region-focusable` 也盯着这条），
 *   而 `table` 是内容不是控件，不该给它加 tabindex；所以套一层容器，`tabindex="0"` 放在容器上，
 *   键盘用户 Tab 进来就能用方向键横滚。
 * - 容器不加 `role` / `aria-label`：语义由 `table` 自己提供，多一层地标只会让读屏在表格上多念一遍。
 *
 * 表格宽度够放时容器不滚动，但仍留一个空的可聚焦停靠点（内容里表格很少，这个代价值得）；
 * 公开与私密文章共用同一条渲染管线，私密文章在加密前就套好。
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function isTable(node: HastNode): boolean {
  return node.tagName === "table";
}

function wrap(node: HastNode): void {
  const children = node.children;
  if (!children) return;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isTable(child)) {
      children[i] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"], tabIndex: 0 },
        children: [child],
      };
      continue;
    }
    wrap(child);
  }
}

export default function rehypeTableScroll() {
  return (tree: HastNode): void => {
    wrap(tree);
  };
}
