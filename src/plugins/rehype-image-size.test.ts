import { test } from "node:test";
import assert from "node:assert/strict";
import rehypeImageSize, { type HastNode } from "./rehype-image-size.ts";

const LOCAL = "/favicon.svg"; // public/ 下真实存在的图（image-size 读出 64×64）
const EXTERNAL = "https://example.com/photo.png";

/** 造一个只含若干 <img> 的最小 hast 树 */
function treeOf(...images: Array<Record<string, unknown>>): HastNode {
  return {
    type: "root",
    children: images.map((properties) => ({ type: "element", tagName: "img", properties: { ...properties } })),
  };
}

/** 跑一遍插件，顺手把 console.warn 收起来（插件用它报「拿不到尺寸」） */
function withWarnings(tree: HastNode): { tree: HastNode; warnings: string[] } {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(" "));
  try {
    rehypeImageSize()(tree);
  } finally {
    console.warn = original;
  }
  return { tree, warnings };
}

function run(...images: Array<Record<string, unknown>>) {
  return withWarnings(treeOf(...images));
}

function props(tree: HastNode, index = 0): Record<string, unknown> {
  return tree.children![index].properties!;
}

test("站内图片：注入尺寸，首图 eager、其余 lazy，全文 decoding=async", () => {
  const { tree, warnings } = run({ src: LOCAL }, { src: LOCAL });

  assert.equal(props(tree, 0).loading, "eager");
  assert.equal(props(tree, 1).loading, "lazy");
  assert.equal(props(tree, 0).decoding, "async");
  assert.equal(props(tree, 1).decoding, "async");
  assert.equal(props(tree, 0).width, 64);
  assert.equal(props(tree, 0).height, 64);
  assert.equal(props(tree, 0)["data-pswp-width"], 64);
  assert.equal(warnings.length, 0, "站内图不该有告警");
});

test("外链图：拿不到尺寸就不静默——懒加载 + 一条汇总告警", () => {
  const { tree, warnings } = run({ src: EXTERNAL }, { src: EXTERNAL });

  assert.equal(props(tree, 0).width, undefined);
  assert.equal(props(tree, 0)["data-pswp-width"], undefined);
  assert.equal(props(tree, 1).loading, "lazy");
  assert.equal(warnings.length, 1, "两张外链图应该只报一条汇总告警");
  assert.match(warnings[0], /2 张图片拿不到构建期尺寸/);
});

test("作者显式写过的属性一律不动", () => {
  const { tree } = run({ src: LOCAL, loading: "lazy", width: 12, decoding: "sync" });

  assert.equal(props(tree).loading, "lazy", "不能把作者写的 lazy 改回 eager");
  assert.equal(props(tree).width, 12);
  assert.equal(props(tree).decoding, "sync");
  assert.equal(props(tree).height, 64, "没写的仍然补上");
});

test("外链图但作者自己给了尺寸：不算未解析，不告警", () => {
  const { warnings } = run({ src: EXTERNAL, width: 800, "data-pswp-width": 800 });

  assert.equal(warnings.length, 0);
});

test("正文里没有 <img>：什么都不做", () => {
  const tree: HastNode = { type: "root", children: [{ type: "element", tagName: "p", properties: {} }] };
  const { warnings } = withWarnings(tree);

  assert.equal(warnings.length, 0);
  assert.equal(tree.children![0].properties!.loading, undefined);
});
