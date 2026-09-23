import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { imageSize } from "image-size";
import { loadEnvFiles } from "../utils/load-env.ts";
import {
  isRemoteHttpUrl,
  resolveRemoteSizes,
  type Size,
} from "../utils/remote-image-size.ts";

/**
 * 构建期给正文 <img> 补齐尺寸与加载属性（plan §9）：
 * - **尺寸**：站内图（src 以 / 开头）直接读 public/ 下的文件；外链图在构建期抓图头
 *   （见 utils/remote-image-size.ts，失败则降级成下面的汇总告警）。两处都是为了消掉
 *   布局抖动，并让灯箱拿到构建期尺寸（没有 data-pswp-* 就只能等运行时 naturalWidth）。
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

export interface ImageSizeOptions {
  /** 外链尺寸探测：默认走网络 + 磁盘缓存；测试注入 stub，离线构建可设 SKIP_REMOTE_IMAGE_SIZE */
  probeRemote?: (url: string) => Promise<Size | null>;
  /** 尺寸缓存文件（默认 .astro/remote-image-sizes.json）；测试用临时文件，别污染本地缓存 */
  cacheFile?: string;
}

const PUBLIC_DIR = "public";
/** 告警里最多列几张示例，其余只报数量 */
const WARN_EXAMPLES = 3;
/** 离线/受限环境跳过外链抓取（这些图会走告警） */
const SKIP_ENV = "SKIP_REMOTE_IMAGE_SIZE";

// markdown 处理器跑在 Vite 之外（实测那里 import.meta.env 是 undefined），
// 所以构建期开关（如 SKIP_REMOTE_IMAGE_SIZE）要能放 .env 里就地生效。
loadEnvFiles();

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

function hasSize(node: HastNode): boolean {
  const props = node.properties!;
  return props.width !== undefined || props["data-pswp-width"] !== undefined;
}

/** 抓不到的图：说清楚后果与怎么办，别让人以为一切正常 */
function warnUnresolved(srcs: string[], skipped: boolean): void {
  if (srcs.length === 0) return;
  const examples = srcs.slice(0, WARN_EXAMPLES).map((src) => `\n      - ${src}`).join("");
  const rest = srcs.length > WARN_EXAMPLES ? `\n      …另有 ${srcs.length - WARN_EXAMPLES} 张` : "";
  const hint = skipped
    ? `      当前设了 ${SKIP_ENV}，本轮没有抓外链尺寸。`
    : "      外链图行不通多为网络失败/超时，或格式读不出；只支持站内 / 开头的路径与 http(s) 外链，\n" +
      `      相对路径、data: 之类的 src 构建期读不到。想跳过抓取可设 ${SKIP_ENV}=1。`;
  console.warn(
    `[image-size] ${srcs.length} 张图片拿不到构建期尺寸：${examples}${rest}\n` +
      "      后果：没有 width/height（可能布局抖动），灯箱要先等它加载完才能打开。\n" +
      hint +
      "\n      想彻底拿到构建期尺寸，可以把图片放进 public/ 用站内路径引用。",
  );
}

/**
 * 收集器：遍历一次树，站内图当场补尺寸，外链图记下来等抓取结果。
 */
function createCollector(): {
  visit(node: HastNode): void;
  remote: Array<{ node: HastNode; src: string }>;
  unresolved: string[];
} {
  const remote: Array<{ node: HastNode; src: string }> = [];
  const unresolved: string[] = [];
  let imageCount = 0;

  return {
    remote,
    unresolved,
    visit(node) {
      if (node.tagName !== "img" || !node.properties) return;
      imageCount += 1;
      applyLoading(node, imageCount === 1);

      const src = node.properties.src;
      if (typeof src !== "string") return;

      const local = localImageSize(src);
      if (local) {
        applySize(node, local);
        return;
      }
      if (isRemoteHttpUrl(src)) {
        // 作者自己给了尺寸就不必抓（白花一次网络往返）
        if (!hasSize(node)) remote.push({ node, src });
        return;
      }
      // 既不是站内图也不是外链（相对路径、data: 之类）：拿不到尺寸
      if (!hasSize(node)) unresolved.push(src);
    },
  };
}

export default function rehypeImageSize(options: ImageSizeOptions = {}) {
  return async (tree: HastNode): Promise<void> => {
    const collector = createCollector();
    walk(tree, collector.visit);

    const skipped = Boolean(process.env[SKIP_ENV]);
    if (collector.remote.length > 0 && !skipped) {
      const sizes = await resolveRemoteSizes(
        collector.remote.map((item) => item.src),
        options.probeRemote,
        options.cacheFile,
      );
      for (const item of collector.remote) {
        const size = sizes.get(item.src);
        if (size && !hasSize(item.node)) applySize(item.node, size);
      }
    }

    for (const item of collector.remote) {
      if (!hasSize(item.node)) collector.unresolved.push(item.src);
    }
    warnUnresolved(collector.unresolved, skipped);
  };
}