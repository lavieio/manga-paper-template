/**
 * 构建期给 Shiki 代码块套一层 .code-wrap，并在右上角塞一个「复制」按钮（plan §7.4）
 *
 * - 公开文章与私密文章共用同一条渲染管线：私密文章在**加密前**注入，
 *   解密后天然带按钮。复制逻辑见 src/scripts/code-copy.ts（事件委托，
 *   对解密后注入的内容同样生效），所以这里只负责结构。
 * - 命中条件是 `<pre><code>`：用户的 rehype 插件跑在 **Shiki 之前**，
 *   这时还没有 astro-code 类与 data-language，不能按它们匹配。
 * - 包一层是为了让按钮待在**滚动容器之外**：.astro-code 自己 overflow-x: auto，
 *   绝对定位的后代会被一起横向滚走，按钮就跟着代码跑了。
 * - 按钮位置（压在上边框）只写在 CSS 里，改位置不用动构建规则。
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function isCodeBlock(node: HastNode): boolean {
  if (node.tagName !== "pre") return false;
  return (node.children ?? []).some((child) => child.tagName === "code");
}

/** 每次新建一份节点，避免多个代码块共享同一个对象 */
function copyButton(): HastNode {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["code-copy"],
      "aria-label": "复制代码",
      "aria-live": "polite",
    },
    children: [{ type: "text", value: "复制" }],
  };
}

function wrap(node: HastNode): void {
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isCodeBlock(child)) {
      children[i] = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-wrap"] },
        children: [child, copyButton()],
      };
      continue;
    }
    wrap(child);
  }
}

export default function rehypeCodeCopy() {
  return (tree: HastNode): void => {
    wrap(tree);
  };
}
