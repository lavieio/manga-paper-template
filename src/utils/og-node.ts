/**
 * Satori 元素的最小形状与构造工具。
 *
 * 仓库里没有 React 依赖（Satori 的入参类型来自 react），所以自己声明元素/文本节点的形状。
 * 单独成文件是为了让「界面构件」（og-chrome）与「卡片内容」（og-tree）共用同一套小工具，
 * 而不是互相 import 成环。
 */

export interface OgNode {
  readonly type: string;
  readonly props: {
    readonly style: Readonly<Record<string, string | number>>;
    readonly children?: OgNode | string | readonly (OgNode | string)[];
  };
}

export const node = (
  type: string,
  style: OgNode["props"]["style"],
  children?: OgNode["props"]["children"],
): OgNode => ({ type, props: { style, children } });

export const text = (style: OgNode["props"]["style"], content: string): OgNode =>
  node("div", { display: "flex", ...style }, content);

/** 深度优先收集树里所有字符串：OG 字体子集按这些字符切，改了版式也不会漏字 */
export function collectTexts(root: OgNode): string[] {
  const out: string[] = [];
  const walk = (item: OgNode | string | readonly (OgNode | string)[] | undefined): void => {
    if (item === undefined) return;
    if (typeof item === "string") out.push(item);
    else if (Array.isArray(item)) item.forEach(walk);
    else walk((item as OgNode).props.children);
  };
  walk(root);
  return out;
}
