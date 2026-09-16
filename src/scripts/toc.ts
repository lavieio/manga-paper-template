/** TOC 客户端逻辑：公共文章由构建期输出链接；私密文章解密后现场构建链接，两者共用本模块 */

const ACTIVATE_ROOT_MARGIN = "0px 0px -70% 0px";

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
      li.appendChild(a);
      list.appendChild(li);
    }
  }
  initToc();
}

/** 初始化滚动联动 + 弹层开合（幂等：重复调用不重复绑定） */
export function initToc(): void {
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
