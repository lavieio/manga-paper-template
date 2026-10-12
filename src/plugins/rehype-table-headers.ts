/**
 * 构建期给「矩阵表」补行表头。
 *
 * markdown 里常见的写法是左上角表头留空（行是标签、列是属性）：
 *
 * ```
 * |    | IS   | IX   |
 * |----|------|------|
 * | IS | TRUE | TRUE |
 * ```
 *
 * 这种表在 axe 的 `td-has-header` 下会红：首列的 `<td>` 找不到表头。
 * 修法不是往空格里塞占位文案（读屏会念出一句没有意义的字），
 * 而是把首列本来就在承担的行标签升格成 `<th scope="row">`——语义正确，读屏按「行标题」念。
 *
 * 只在「首列表头为空」时动手：表头写了字的表，说明作者把首列当数据列，
 * 那种表升格反而会把数据念成标题。公开与私密文章共用同一条渲染管线，加密前就已修好。
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function isElement(node: HastNode, tagName: string): boolean {
  return node.type === "element" && node.tagName === tagName;
}

function textOf(node: HastNode): string {
  if (node.type === "text") return String((node as { value?: unknown }).value ?? "");
  return (node.children ?? []).map(textOf).join("");
}

/** 行里的第一个单元格（`th` 或 `td`） */
function firstCell(row: HastNode): HastNode | null {
  return (row.children ?? []).find((child) => isElement(child, "th") || isElement(child, "td")) ?? null;
}

function walk(node: HastNode): void {
  if (isElement(node, "table")) fixTable(node);
  for (const child of node.children ?? []) walk(child);
}

function fixTable(table: HastNode): void {
  const children = table.children ?? [];
  const corner = firstCell(firstRow(children.find((child) => isElement(child, "thead"))));
  if (!corner || textOf(corner).trim() !== "") return;

  for (const section of children.filter((child) => isElement(child, "tbody"))) {
    for (const row of rowsOf(section)) promoteFirstCell(row);
  }
}

/** 表头/表体里的第一行 */
function firstRow(section: HastNode | undefined): HastNode | null {
  return rowsOf(section)[0] ?? null;
}

function rowsOf(section: HastNode | undefined): HastNode[] {
  return (section?.children ?? []).filter((child) => isElement(child, "tr"));
}

/** 首列升格成行表头（已经是 `th` 就不动） */
function promoteFirstCell(row: HastNode): void {
  const cell = firstCell(row);
  if (!cell || cell.tagName !== "td") return;
  cell.tagName = "th";
  cell.properties = { ...cell.properties, scope: "row" };
}

export default function rehypeTableHeaders() {
  return (tree: HastNode): void => {
    walk(tree);
  };
}
