/**
 * PhotoSwipe 灯箱（plan §9）
 * - 事件委托：正文（含私密文章解密后注入的内容）任意 <img> 点击即开
 * - 首次点击时才动态加载 photoswipe 与样式（首屏零负担）
 * - 尺寸优先取 data-pswp-*（构建期注入）；外链图退化为运行时 naturalWidth
 * - 滚轮缩放：wheelToZoom（PhotoSwipe 默认滚轮只是平移）
 */

interface PswpItem {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

let loading: Promise<typeof import("photoswipe").default> | null = null;

/** 懒加载 PhotoSwipe（含其样式与稿纸风覆盖样式），只加载一次 */
function loadPhotoSwipe() {
  loading ??= Promise.all([
    import("photoswipe"),
    import("photoswipe/dist/photoswipe.css"),
    import("../styles/lightbox.css"),
  ]).then(([mod]) => mod.default);
  return loading;
}

function itemSize(img: HTMLImageElement): { width: number; height: number } {
  const w = Number(img.dataset.pswpWidth) || img.naturalWidth;
  const h = Number(img.dataset.pswpHeight) || img.naturalHeight;
  return { width: w, height: h };
}

/** 外链图无构建期尺寸：未加载完时等 decode，避免灯箱拿到 0 尺寸打不开 */
async function ensureDecoded(img: HTMLImageElement): Promise<void> {
  if (img.naturalWidth > 0 || img.complete) return;
  await img.decode().catch(() => undefined);
}

function collectItems(images: HTMLImageElement[]): PswpItem[] {
  return images.map((img) => {
    const { width, height } = itemSize(img);
    return {
      src: img.currentSrc || img.src,
      width,
      height,
      alt: img.alt || undefined,
    };
  });
}

export function initLightbox(): void {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement | null;
    const img = target?.closest<HTMLImageElement>(".prose img");
    if (!img) return;

    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".prose img"));
    const index = images.indexOf(img);

    event.preventDefault();
    const PhotoSwipe = await loadPhotoSwipe();
    await ensureDecoded(img);
    const pswp = new PhotoSwipe({
      dataSource: collectItems(images),
      index,
      bgOpacity: 0.92,
      showHideAnimationType: "zoom",
      counter: true,
      // 默认滚轮是平移；开启后滚轮直接缩放（Ctrl+滚轮两种模式下都缩放）
      wheelToZoom: true,
    });
    pswp.init();
  });
}
