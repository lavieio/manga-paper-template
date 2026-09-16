import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize } from "image-size";

/**
 * 构建期给正文 <img> 注入真实尺寸（plan §9）：
 * - 仅处理 /public 下的本地图片（src 以 / 开头）；外链读不到尺寸，退化为运行时 naturalWidth
 * - 注入 width/height（防布局抖动）与 data-pswp-width/height（PhotoSwipe 打开必需）
 */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const PUBLIC_DIR = "public";

function walk(node: HastNode, fn: (el: HastNode) => void): void {
  if (node.type === "element") fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

function localImageSize(src: string): { width: number; height: number } | null {
  if (!src.startsWith("/")) return null;
  const filePath = join(PUBLIC_DIR, src);
  if (!existsSync(filePath)) return null;
  try {
    const { width, height } = imageSize(readFileSync(filePath));
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}

export default function rehypeImageSize() {
  return (tree: HastNode): void => {
    walk(tree, (node) => {
      if (node.tagName !== "img" || !node.properties) return;
      const src = node.properties.src;
      if (typeof src !== "string") return;
      const size = localImageSize(src);
      if (!size) return;
      node.properties.width = size.width;
      node.properties.height = size.height;
      node.properties["data-pswp-width"] = size.width;
      node.properties["data-pswp-height"] = size.height;
    });
  };
}
