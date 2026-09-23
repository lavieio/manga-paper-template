/**
 * PhotoSwipe 灯箱（plan §9）
 * - 事件委托：正文（含私密文章解密后注入的内容）任意 <img> 点击即开
 * - 只有 PhotoSwipe 本体懒加载（首次点击才 import()），首屏零负担
 * - **样式必须静态导入**：Astro 的 inlineStylesheets 会把页面 CSS 内联成 <style> 并删掉产物
 *   文件；样式一旦走动态 import，Vite 注入的 <link rel=stylesheet> 一定 404，进而让整个
 *   动态 import 链 reject，表现为「点了图片没反应」且无任何报错。静态导入由 Astro 统一处理
 *   （内联或外链都安全）；代价是文章页多约 9 KB 内联 CSS，换来灯箱一定可用。
 * - 尺寸优先取 data-pswp-*（构建期注入）；外链图退化为运行时 naturalWidth。
 *   尺寸仍未知的（外链图 + 还没加载）不放进图集：PhotoSwipe 会按 0 尺寸排版，翻过去就是空白；
 *   它们会在后台转 eager 并解码，下一次点开就齐了。
 * - 滚轮缩放：wheelToZoom（PhotoSwipe 默认滚轮只是平移）
 */
import "photoswipe/dist/photoswipe.css";
import "../styles/lightbox.css";

interface PswpItem {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

const ERROR_TEXT = "图片查看器加载失败，请刷新后重试";
/** 失败提示停留时长；够看清又不至于长期占位 */
const ERROR_MS = 4000;

let loading: Promise<typeof import("photoswipe").default> | null = null;

/** 懒加载 PhotoSwipe 本体，只加载一次；失败则清掉缓存，让下次点击可以重试 */
function loadPhotoSwipe(): Promise<typeof import("photoswipe").default> {
  loading ??= import("photoswipe")
    .then((mod) => mod.default)
    .catch((err: unknown) => {
      loading = null;
      throw err;
    });
  return loading;
}

function itemSize(img: HTMLImageElement): { width: number; height: number } {
  const w = Number(img.dataset.pswpWidth) || img.naturalWidth;
  const h = Number(img.dataset.pswpHeight) || img.naturalHeight;
  return { width: w, height: h };
}

/** 外链图无构建期尺寸：未加载完时转 eager 并等 decode，免得灯箱拿到 0 尺寸打不开 */
async function ensureDecoded(img: HTMLImageElement): Promise<void> {
  if (img.naturalWidth > 0 || img.complete) return;
  img.loading = "eager";
  await img.decode().catch(() => undefined);
}

interface Gallery {
  items: PswpItem[];
  /** 被点中的那张在 items 里的下标 */
  index: number;
}

/**
 * 收集本次可用的图集：只放尺寸已知的（未知的连 index 一起重算），
 * 免得 PhotoSwipe 按 0 尺寸排版、翻页翻出一片空白。
 * 跳过的那些交给 ensureDecoded 在后台加载，下次点开就能进图集。
 */
function collectGallery(images: HTMLImageElement[], clicked: HTMLImageElement): Gallery {
  const items: PswpItem[] = [];
  const skipped: string[] = [];
  let index = 0;

  for (const img of images) {
    const { width, height } = itemSize(img);
    if (width === 0 || height === 0) {
      skipped.push(img.currentSrc || img.src);
      void ensureDecoded(img);
      continue;
    }
    if (img === clicked) index = items.length;
    items.push({
      src: img.currentSrc || img.src,
      width,
      height,
      alt: img.alt || undefined,
    });
  }

  if (skipped.length > 0) {
    console.warn(
      `[lightbox] ${skipped.length} 张图尺寸未知，本次跳过（正在后台加载，再点一次就齐）：`,
      skipped,
    );
  }
  return { items, index };
}

/** 加载失败不静默：就地给可见提示（样式在 lightbox.css，静态导入保证一定在场） */
function showLoadError(img: HTMLImageElement, reason: unknown): void {
  console.error("[lightbox] PhotoSwipe 加载失败：", reason);
  const anchor = img.closest("figure") ?? img;
  if (anchor.nextElementSibling?.classList.contains("lightbox-error")) return;

  const tip = document.createElement("p");
  tip.className = "lightbox-error";
  tip.setAttribute("role", "status");
  tip.textContent = ERROR_TEXT;
  anchor.after(tip);
  window.setTimeout(() => tip.remove(), ERROR_MS);
}

async function openLightbox(img: HTMLImageElement): Promise<void> {
  try {
    const PhotoSwipe = await loadPhotoSwipe();
    await ensureDecoded(img);
    // 点击时现取当前正文图集：私密文章是解密后才注入 <img> 的，构建期拿不到
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".prose img"));
    const { items, index } = collectGallery(images, img);
    if (items.length === 0) {
      // 图片自身就没加载出来（坏图或断网）：说一声，别让用户以为点击没生效
      console.warn("[lightbox] 这张图拿不到尺寸，无法打开：", img.currentSrc || img.src);
      return;
    }
    const pswp = new PhotoSwipe({
      dataSource: items,
      index,
      bgOpacity: 0.92,
      showHideAnimationType: "zoom",
      counter: true,
      // 默认滚轮是平移；开启后滚轮直接缩放（Ctrl+滚轮两种模式下都缩放）
      wheelToZoom: true,
    });
    pswp.init();
  } catch (err) {
    showLoadError(img, err);
  }
}

export function initLightbox(): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const img = target?.closest<HTMLImageElement>(".prose img");
    if (!img) return;

    event.preventDefault();
    void openLightbox(img);
  });
}
