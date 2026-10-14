/**
 * 页面字符集的取字符规则（纯函数，按页切字体的输入）。
 *
 * 目标是「这个页面渲染时到底会出现哪些字符」，取法必须**宁可多取、不可漏取**：
 * 漏一个字符，那一格就会落到 fallback（consolas / 系统字体），
 * 多取一个字符只是让子集大几百字节。
 *
 * 因此：
 * - **注释必须先整块去掉**：注释里出现 `<style>` 这种字面文本时（文档里写「想自定义就写 <style>」就会），
 *   下面的 script/style 正则会把注释里那个当成真的开标签，一路吃到正文里真正的 `</style>`，
 *   中间整段正文的字全掉出子集——页面掉回 fallback，看上去就是「字体忽大忽小」。
 *   注释本来也不会渲染，去掉它只赚不亏；
 * - 数字实体（`&#x4E2D;`）必须还原，否则「中」会漏；
 * - 具名实体（`&amp;`）不还原——它本身是 ASCII，还原与否都是超集。
 *
 * CSS `content:` 里的字面文本（`content: "└ "`）不在 HTML 里，得单独扫样式表，
 * 否则那几格会掉出子集（`src/styles/prose.css` 的引用前缀就是这种）。
 */

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const SCRIPT_OR_STYLE = /<(script|style)\b[\s\S]*?<\/\1>/gi;
const NUMERIC_ENTITY = /&#(?:x([0-9a-f]+)|(\d+));/gi;
const CSS_CONTENT_LITERAL = /content\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
/** CSS 转义：`\201C`（码位）或 `\"`（字面字符） */
const CSS_ESCAPE = /\\(?:([0-9a-fA-F]{1,6})\s?|(.))/g;

/** 数字实体还原；具名实体与文本原样保留（见文件头注释） */
export function decodeNumericEntities(html: string): string {
  return html.replace(NUMERIC_ENTITY, (match, hex: string | undefined, dec: string | undefined) => {
    const code = Number.parseInt(hex ?? dec ?? "", hex ? 16 : 10);
    return Number.isNaN(code) ? match : String.fromCodePoint(code);
  });
}

/** HTML → 会渲染成文字的字符（去掉注释、script/style 与标签） */
export function pageText(html: string): string {
  return decodeNumericEntities(
    html.replace(HTML_COMMENT, " ").replace(SCRIPT_OR_STYLE, " ").replace(/<[^>]*>/g, " "),
  );
}

/** CSS 里 `content: "…"` 的字面字符（含 CSS 转义），用于补齐样式表生成的字 */
export function cssContentChars(css: string): string {
  let out = "";
  for (const match of css.matchAll(CSS_CONTENT_LITERAL)) {
    out += decodeCssEscapes(match[1] ?? match[2] ?? "");
  }
  return out;
}

function decodeCssEscapes(value: string): string {
  return value.replace(CSS_ESCAPE, (_match, hex: string | undefined, literal: string | undefined) => {
    if (literal !== undefined) return literal;
    const code = Number.parseInt(hex ?? "", 16);
    return Number.isNaN(code) ? "" : String.fromCodePoint(code);
  });
}
