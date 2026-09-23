import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize } from "image-size";

/**
 * 构建期给正文 <img> 补齐尺寸与加载属性（plan §9）：
 * - **尺寸**：只读得到 /public 下的站内图片（src 以 / 开头）。读不到的不再静默跳过——汇总告警：
 *   没有 width/height 就可能布局抖动，没有 data-pswp-* 灯箱就只能等运行时 naturalWidth。
 * - **加载**：首图 eager，其余 lazy + 全文 decoding="async"。长文一次拉全部图片是白流量，
 *   何况它们大多压在首屏下面（审计报告里 10 张图的文章就是这么拉的）。
 * - 作者在 markdown 里显式写过的属性一律不覆盖：想给某张图 fetchpriority="high"、或让首图也 lazy，
 *   直接写 HTML 即可。
 */
export interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

interface Size {
  width: number;
  height: number;
}

const PUBLIC_DIR = "public";
/** 告警里最多列几张示例，其余只报数量 */
const WARN_EXAMPLES = 3;

function walk(node: HastNode, fn: (el: HastNode) => void): void {
  if (node.type === "element") fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

function localImageSize(src: string): Size | null {
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

/** 作者写过的尺寸优先，只补空缺（布局用 width/height，灯箱用 data-pswp-*） */
function applySize(node: HastNode, size: Size): void {
  const props = node.properties!;
  props.width ??= size.width;
  props.height ??= size.height;
  props["data-pswp-width"] ??= size.width;
  props["data-pswp-height"] ??= size.height;
}

/** 首图不 lazy：它可能就是 LCP；其余懒加载（显式写过的 loading 不动） */
function applyLoading(node: HastNode, first: boolean): void {
  const props = node.properties!;
  props.loading ??= first ? "eager" : "lazy";
  props.decoding ??= "async";
}

/** 外链图的尺寸构建期读不到：说清楚后果，别让人以为一切正常 */
function warnUnresolved(srcs: string[]): void {
  if (srcs.length === 0) return;
  const examples = srcs.slice(0, WARN_EXAMPLES).map((src) => `\n      - ${src}`).join("");
  const rest = srcs.length > WARN_EXAMPLES ? `\n      …另有 ${srcs.length - WARN_EXAMPLES} 张` : "";
  console.warn(
    `[image-size] ${srcs.length} 张图片拿不到构建期尺寸（src 不是 public/ 下的站内路径）：${examples}${rest}\n` +
      "      后果：没有 width/height（可能布局抖动），灯箱要先等它加载完才能打开。\n" +
      "      想拿到构建期尺寸就把图片放进 public/ 用站内路径引用。",
  );
}

export default function rehypeImageSize() {
  return (tree: HastNode): void => {
    const unresolved: string[] = [];
    let imageCount = 0;

    walk(tree, (node) => {
      if (node.tagName !== "img" || !node.properties) return;
      imageCount += 1;
      applyLoading(node, imageCount === 1);

      const src = node.properties.src;
      if (typeof src !== "string") return;

      const size = localImageSize(src);
      if (size) {
        applySize(node, size);
        return;
      }
      // 作者自己给了尺寸（写了 HTML）就不算未解析
      if (node.properties.width === undefined && node.properties["data-pswp-width"] === undefined) {
        unresolved.push(src);
      }
    });

    warnUnresolved(unresolved);
  };
}
