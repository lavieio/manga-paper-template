/** TOC 客户端逻辑：公共文章由构建期输出链接；私密文章解密后现场构建链接，两者共用本模块 */

const ACTIVATE_ROOT_MARGIN = "0px 0px -70% 0px";

/** 两端渐隐长度：目录列表没有滚动条，靠它提示「还有内容」 */
const FADE_TOP = "16px";
const FADE_BOTTOM = "20px";
/** 亚像素滚动的判等容差 */
const EDGE_EPSILON = 2;

/** resize 监听只绑一次 */
let fadeResizeBound = false;

/** 按溢出方向写两端渐隐长度（上/下不到头才渐隐） */
function syncListFade(list: HTMLElement): void {
  const canUp = list.scrollTop > EDGE_EPSILON;
  const canDown = list.scrollTop + list.clientHeight < list.scrollHeight - EDGE_EPSILON;
  list.classList.toggle("is-scrollable", canUp || canDown);
  list.style.setProperty("--fade-top", canUp ? FADE_TOP : "0px");
  list.style.setProperty("--fade-bottom", canDown ? FADE_BOTTOM : "0px");
}

/** 给目录列表挂上「溢出渐隐」：重复调用只重算状态，不重复绑事件 */
function initTocFade(): void {
  const lists = [...document.querySelectorAll<HTMLElement>("[data-toc], [data-toc-popover]")];
  for (const list of lists) {
    if (!list.dataset.fadeBound) {
      list.dataset.fadeBound = "1";
      list.addEventListener("scroll", () => syncListFade(list), { passive: true });
    }
    syncListFade(list);
  }
  if (fadeResizeBound) return;
  fadeResizeBound = true;
  // 视口高度变了 max-height 就变，溢出方向随之变
  window.addEventListener("resize", () => {
    document.querySelectorAll<HTMLElement>("[data-toc], [data-toc-popover]").forEach(syncListFade);
  });
}

/** 为 .prose 里的 h2/h3/h4 构建 TOC 链接并初始化滚动监听（私密文章解密后调用） */
export function buildToc(article: HTMLElement): void {
  const lists = document.querySelectorAll<HTMLElement>("[data-toc], [data-toc-popover]");
  const headings = article.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id], h4[id]");
  for (const list of lists) {
    list.innerHTML = "";
    for (const h of headings) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.dataset.depth = h.tagName.slice(1);
      a.dataset.slug = h.id;
      a.textContent = h.textContent ?? "";
      // 列表是单行省略，完整标题挂在 title 上（私密文章同样）
      a.title = a.textContent;
      li.appendChild(a);
      list.appendChild(li);
    }
  }
  initToc();
}

/** 初始化滚动联动 + 弹层开合（幂等：重复调用不重复绑定） */
export function initToc(): void {
  // 溢出渐隐与 active 高亮无关，空列表也要走一遍（私密文章解密后重建时复用）
  initTocFade();
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-toc] a, [data-toc-popover] a"),
  );
  if (links.length === 0) return;

  const bySlug = new Map<string, HTMLAnchorElement[]>();
  for (const a of links) {
    const slug = a.dataset.slug!;
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), a]);
  }

  // 仅当前小节高亮（父级保持淡墨，焦点唯一）
  const activate = (slug: string) => {
    links.forEach((a) => a.classList.toggle("on", a.dataset.slug === slug));
  };

  const headings = [...bySlug.keys()]
    .map((slug) => document.getElementById(slug))
    .filter((el): el is HTMLElement => el !== null);

  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) activate(en.target.id);
      }
    },
    { rootMargin: ACTIVATE_ROOT_MARGIN, threshold: 0 },
  );
  headings.forEach((h) => io.observe(h));

  const fab = document.querySelector<HTMLButtonElement>(".toc-fab");
  const popover = document.querySelector<HTMLElement>(".toc-popover");
  if (fab?.dataset.bound) return;
  if (fab) fab.dataset.bound = "1";
  fab?.addEventListener("click", () => {
    const open = popover?.classList.toggle("open");
    fab.setAttribute("aria-expanded", String(!!open));
  });
  popover?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) {
      popover.classList.remove("open");
      fab?.setAttribute("aria-expanded", "false");
    }
  });
}
