/**
 * 外链图片尺寸探测（plan §9 / P1-4）。
 *
 * 正文里的外链图拿不到尺寸 → 没有 width/height（图片落地时布局抖动），也没有 data-pswp-*
 * （灯箱只能退到运行时 naturalWidth：图还没加载完时点开就只能跳过它）。所以构建期把图头读出来：
 *
 * - **流式**读响应，一解析出尺寸就断开（不等整张图）。Astro 内部的 inferRemoteSize 是同一思路，
 *   但它在 astro/assets/utils 里、属于没写进文档的半公开路径，也不接受超时，所以这里自己实现。
 * - 单张超时 + 并发上限 + 磁盘缓存（默认 .astro/，30 天），别拖慢构建、也别每次重建都重抓。
 * - **失败一律返回 null**：由调用方降级成构建期告警，绝不因为一张外链图挂掉整个构建。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { imageSize } from "image-size";

export interface Size {
  width: number;
  height: number;
}

export interface SizeCacheEntry extends Size {
  /** 写入时间戳；超过 CACHE_TTL_MS 视为过期 */
  at: number;
}

interface ProbeOptions {
  /** 便于测试注入；默认用全局 fetch（Node 22 内置） */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
}

/** 单张最长等待：超时当拿不到（构建不能被一张图拖住） */
const TIMEOUT_MS = 8_000;
/** 最多读这么多字节就放弃：常见格式几十 KB 内就能读出尺寸 */
const MAX_BYTES = 512 * 1024;
/**
 * 至少凑够这么多字节才敢解析。
 * image-size 对**被截断**的头部不报错，而是把几个字节当尺寸返回（实测 20 字节的 PNG 头会被读成
 * height=1929445376）。所以先等够 PNG/GIF/BMP/WebP 所需的最长头部（PNG 的 IHDR 结束在 33 字节），
 * 再用下面的合理性区间兜底。
 */
const MIN_PROBE_BYTES = 33;
/** PNG/JPEG 的尺寸上限就是 65535，超出这个范围一定是解析到了垃圾 */
const MAX_DIMENSION = 65_535;
/** 同时飞几个请求 */
const CONCURRENCY = 6;
/** 缓存有效期：图换了但 URL 没换的情况靠它兜底 */
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 缓存文件；.astro/ 是 Astro 自己的缓存目录（已在 .gitignore 里） */
export const CACHE_FILE = ".astro/remote-image-sizes.json";

export function isRemoteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * 从「可能只有前面几 KB」的字节里读出尺寸。
 * 字节不够、格式读不出、或读出的值不合理（截断的头部会让 image-size 返回天文数字）都返回 null，
 * 由调用方继续读更多或最终放弃。
 */
export function sizeFromBuffer(bytes: Uint8Array): Size | null {
  if (bytes.length < MIN_PROBE_BYTES) return null;
  let width: number | undefined;
  let height: number | undefined;
  try {
    ({ width, height } = imageSize(Buffer.from(bytes)));
  } catch {
    return null;
  }
  if (!width || !height) return null;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) return null;
  return { width, height };
}

function concat(prev: Uint8Array, next: Uint8Array): Uint8Array {
  const merged = new Uint8Array(prev.length + next.length);
  merged.set(prev, 0);
  merged.set(next, prev.length);
  return merged;
}

/** 流式读图头拿尺寸；网络失败、超时、格式读不出都返回 null */
export async function probeRemoteSize(url: string, options: ProbeOptions = {}): Promise<Size | null> {
  const { fetchImpl = fetch, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES } = options;

  let response: Response;
  try {
    // 超时会连响应体一起中断（undici 把 signal 带到底层），所以下面的 read() 不会挂死
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return null;
  }
  if (!response.ok || !response.body) return null;

  const reader = response.body.getReader();
  let bytes = new Uint8Array();
  try {
    while (bytes.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes = concat(bytes, value);
      const size = sizeFromBuffer(bytes);
      if (size) return size;
    }
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return null;
}

/** 读缓存；文件不存在、内容坏了、条目过期都当成没有 */
export function loadSizeCache(file: string = CACHE_FILE): Map<string, SizeCacheEntry> {
  if (!existsSync(file)) return new Map();
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Record<string, SizeCacheEntry>;
    const now = Date.now();
    return new Map(
      Object.entries(raw).filter(
        ([, entry]) => Number.isFinite(entry?.at) && entry.width > 0 && entry.height > 0 && now - entry.at < CACHE_TTL_MS,
      ),
    );
  } catch {
    return new Map();
  }
}

/** 写缓存；写不了也不算错（构建照常继续） */
export function saveSizeCache(entries: Map<string, SizeCacheEntry>, file: string = CACHE_FILE): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* 忽略 */
  }
}

/**
 * 批量解析：去重 → 命中缓存直接给 → 剩下的按并发上限抓 → 只把新抓到的写回缓存。
 * 抓不到的条目不在返回值里（调用方按「没尺寸」处理）。
 */
export async function resolveRemoteSizes(
  urls: string[],
  probe: (url: string) => Promise<Size | null> = probeRemoteSize,
  cacheFile: string = CACHE_FILE,
): Promise<Map<string, Size>> {
  const sizes = new Map<string, Size>();
  const cache = loadSizeCache(cacheFile);
  const pending: string[] = [];

  for (const url of new Set(urls)) {
    const hit = cache.get(url);
    if (hit) sizes.set(url, { width: hit.width, height: hit.height });
    else pending.push(url);
  }

  let added = false;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const probed = await Promise.all(batch.map((url) => probe(url).catch(() => null)));
    probed.forEach((size, index) => {
      if (!size) return;
      sizes.set(batch[index], size);
      cache.set(batch[index], { ...size, at: Date.now() });
      added = true;
    });
  }

  if (added) saveSizeCache(cache, cacheFile);
  return sizes;
}
