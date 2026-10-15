/**
 * 关于页正文的构建期加工。
 *
 * 用户在 `src/content/pages/about.md` 里可以直接写 HTML 与 `<style>`（Astro 的 markdown 原样透传），
 * 但裸类名（`.card` / `.tag` / `p`…）会作用到**整个页面**——页头页脚就在同一个文档里。
 * 这里把用户的 `<style>` 统一包进 `@scope (.about-custom)`，样式只落在正文容器内，
 * 用户照常写普通 CSS，不用自己想前缀。
 *
 * 不支持 `@scope` 的老浏览器会整段忽略（未知 at-rule）：退化成无样式，但**不会**漏到全站，
 * 方向是安全的。
 */

/** 正文容器的类名，与 `src/pages/about.astro` 保持一致 */
export const CUSTOM_SCOPE_CLASS = "about-custom";

const STYLE_BLOCK = /<style([^>]*)>([\s\S]*?)<\/style>/gi;

/**
 * 把每一段 `<style>` 的内容包进 `@scope (.about-custom)`。
 * 没有 `<style>` 就原样返回；`<style media="…">` 这类属性保留不动。
 */
export function scopeCustomStyles(html: string): string {
  return html.replace(
    STYLE_BLOCK,
    (_match, attrs: string, css: string) =>
      `<style${attrs}>@scope (.${CUSTOM_SCOPE_CLASS}) {\n${css}\n}</style>`,
  );
}
