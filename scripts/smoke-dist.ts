#!/usr/bin/env node
/**
 * 浏览器冒烟（G-2 / G-3）：构建后运行，覆盖构建期断言与 Lighthouse 都抓不到的两件事——
 * 1. 点击正文图片能打开 PhotoSwipe 灯箱（P0-1 曾整片失效：产物断言只能卡住 404，卡不住交互）
 * 2. 窄屏（320/360/412）下私密解锁按钮与搜索输入框完整可见（P0-3 的回归闸门）
 *
 * 用法：npm run build && npm run smoke
 * CHROME_PATH 可指定浏览器；找不到 Chrome、页面没有可用图片时按 SKIP 处理，不误报失败。
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser, resolveChromePath, type Browser, type Sender } from "./browser.ts";

const DIST = "dist";
/** 等页面把脚本跑起来（纯静态站，1.2s 有余） */
const PAGE_SETTLE_MS = 1200;
/** 图片自身落地的最长等待（外链图受网络影响） */
const IMAGE_TIMEOUT_MS = 5000;
/** 点击后等 PhotoSwipe 出现：它是点击时才 import 的 */
const LIGHTBOX_WAIT_MS = 3000;

const NARROW_VIEWPORTS = [320, 360, 412];

const NARROW_CASES = [
  {
    path: "/private/",
    selector: ".gate-btn",
    label: "G-3 窄屏：私密解锁按钮完整可见",
    // 按钮常态宽 96px；被挤/被裁时必然小于它
    minWidth: 96,
  },
  {
    path: "/search/",
    selector: ".search-box input",
    label: "G-3 窄屏：搜索输入框完整可见",
    // 窄于 120px 就看不清输入内容
    minWidth: 120,
  },
];

interface Result {
  name: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
}

interface Rect {
  left: number;
  right: number;
  width: number;
  viewport: number;
}

interface LightboxStats {
  images: number;
  loaded?: boolean;
  pswp?: boolean;
  shown?: number;
  error?: string | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LIGHTBOX_PROBE = `(async () => {
  const imgs = [...document.querySelectorAll('.prose img')];
  if (imgs.length === 0) return { images: 0 };
  const img = imgs[0];
  const ready = () => img.naturalWidth > 0 || img.dataset.pswpWidth;
  const deadline = Date.now() + ${IMAGE_TIMEOUT_MS};
  while (!ready() && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  if (!ready()) return { images: imgs.length, loaded: false };

  img.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, ${LIGHTBOX_WAIT_MS}));
  return {
    images: imgs.length,
    loaded: true,
    pswp: !!document.querySelector('.pswp'),
    shown: document.querySelectorAll('.pswp__img').length,
    error: document.querySelector('.lightbox-error')?.textContent ?? null,
  };
})()`;

const rectProbe = (selector: string) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    left: Math.round(r.left),
    right: Math.round(r.right),
    width: Math.round(r.width),
    viewport: document.documentElement.clientWidth,
  };
})()`;

async function evaluate<T>(send: Sender, expression: string): Promise<T> {
  const reply = await send<{ result?: { value?: T } }>("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return reply.result?.value as T;
}

async function open(browser: Browser, path: string, width?: number): Promise<void> {
  if (width) {
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }
  await browser.send("Page.navigate", { url: browser.base + path });
  await sleep(PAGE_SETTLE_MS);
}

/**
 * 选一篇公开且正文带图的文章：优先带构建期尺寸（data-pswp-width）的，离线也稳。
 * 私密文章的正文在构建期是密文，页面里没有 <img>，直接跳过。
 */
function findImagePost(): string | null {
  const postsDir = join(DIST, "posts");
  if (!existsSync(postsDir)) return null;

  const withSize: string[] = [];
  const fallback: string[] = [];
  for (const slug of readdirSync(postsDir).sort()) {
    const file = join(postsDir, slug, "index.html");
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf8");
    if (html.includes("private-payload") || !html.includes("<img")) continue;
    (html.includes("data-pswp-width") ? withSize : fallback).push(`/posts/${slug}/`);
  }
  return withSize[0] ?? fallback[0] ?? null;
}

async function checkLightbox(browser: Browser): Promise<Result> {
  const name = "G-2 正文图片可打开灯箱";
  const target = findImagePost();
  if (!target) return { name, status: "skip", detail: "没有公开且带图的文章（内容决定，非缺陷）" };

  await open(browser, target);
  const stats = await evaluate<LightboxStats>(browser.send, LIGHTBOX_PROBE);
  if (stats.images === 0) return { name, status: "skip", detail: `${target} 正文里没有图片` };
  if (!stats.loaded) return { name, status: "skip", detail: "图片未加载完（离线或外链图挂了），无法点击" };
  if (stats.pswp && (stats.shown ?? 0) > 0) {
    return { name, status: "pass", detail: `${target}（${stats.images} 张图）` };
  }
  return {
    name,
    status: "fail",
    detail: `${target} 点击后没出现灯箱${stats.error ? `：${stats.error}` : ""}`,
  };
}

async function checkNarrowCase(
  browser: Browser,
  item: (typeof NARROW_CASES)[number],
): Promise<Result> {
  const bad: string[] = [];
  let measured = 0;

  for (const width of NARROW_VIEWPORTS) {
    await open(browser, item.path, width);
    const rect = await evaluate<Rect | null>(browser.send, rectProbe(item.selector));
    if (!rect) continue;
    measured += 1;
    const clipped = rect.left < -1 || rect.right > rect.viewport + 1;
    if (clipped || rect.width < item.minWidth) {
      bad.push(`@${width}px [${rect.left}, ${rect.right}] w=${rect.width}`);
    }
  }

  if (measured === 0) return { name: item.label, status: "skip", detail: `${item.path} 上没有 ${item.selector}` };
  return bad.length > 0
    ? { name: item.label, status: "fail", detail: bad.join(" / ") }
    : { name: item.label, status: "pass", detail: `${NARROW_VIEWPORTS.join(" / ")}px 下都完整可见` };
}

const ICON = { pass: "✅", fail: "❌", skip: "⏭ " };

function report(results: Result[]): void {
  console.log("");
  for (const r of results) {
    console.log(`${ICON[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => r.status === "fail");
  if (failed.length > 0) {
    console.error(`\n❌ 冒烟失败 ${failed.length} 项。\n`);
    process.exit(1);
  }
  console.log("\n冒烟通过。\n");
}

async function main(): Promise<void> {
  const distIndex = join(DIST, "index.html");
  if (!existsSync(distIndex)) {
    console.error(`[smoke] 找不到 ${DIST}/，先跑 npm run build`);
    process.exit(1);
  }

  const chromePath = resolveChromePath();
  if (!chromePath) {
    console.log("⏭  找不到 Chrome（可用 CHROME_PATH 指定路径），跳过浏览器冒烟。");
    return;
  }

  const browser = await launchBrowser(chromePath, DIST);
  let results: Result[];
  try {
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    results = [await checkLightbox(browser)];
    for (const item of NARROW_CASES) results.push(await checkNarrowCase(browser, item));
  } finally {
    await browser.close();
  }

  report(results);
}

main().catch((err: unknown) => {
  console.error(`[smoke] 运行失败：${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
