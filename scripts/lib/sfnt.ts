/**
 * 极简 SFNT 读取：只看 cmap，回答「这个字体到底有哪些字符」。
 *
 * 为什么需要它：`unicode-range` 必须按**字体真正含有的字形**来写。若照「请求的字符集」写，
 * 字库里本来就没有的字符（本站的 ✅❌➕、康熙部首）也会被算成「已覆盖」——
 * 覆盖断言会因此变瞎，将来真漏字也发现不了。
 *
 * 只读 `cmap`，不碰 glyf/loca，所以 WOFF2 一层解压（fontverter）就够；格式 0/4/6/12 之外
 * （LastResort 用的 13、14）直接忽略：那几种在正常字体里只作兜底，不影响码位覆盖。
 */
import { readFileSync } from "node:fs";
import fontverter from "fontverter";

/** 字体文件（TTF / WOFF / WOFF2 都行）→ cmap 覆盖的码位集合 */
export async function readCodepoints(file: string): Promise<Set<number>> {
  const raw = readFileSync(file);
  const sfnt: Buffer = fontverter.detectFormat(raw) === "sfnt" ? raw : Buffer.from(await fontverter.convert(raw, "sfnt"));
  return cmapCodepoints(sfnt);
}

const CMAP_TAG = 0x636d_6170; // 'cmap'

/**
 * 同步版：只吃未压缩的 SFNT（仓库里的 `assets/fonts/*.ttf` 就是）。
 * 给需要同步流程的调用方（产物断言）用；碰到 woff2 请用 `readCodepoints()`。
 */
export function readCmapSync(file: string): Set<number> {
  const raw = readFileSync(file);
  if (fontverter.detectFormat(raw) !== "sfnt") throw new Error(`${file} 不是未压缩的 SFNT：改用 readCodepoints()`);
  return cmapCodepoints(raw);
}

export function cmapCodepoints(font: Buffer): Set<number> {
  const codepoints = new Set<number>();
  const offset = tableOffset(font, CMAP_TAG);
  if (offset === null) return codepoints;

  const subtables = font.readUInt16BE(offset + 2);
  for (let i = 0; i < subtables; i += 1) {
    readSubtable(font, offset + font.readUInt32BE(offset + 4 + i * 8 + 4), codepoints);
  }
  return codepoints;
}

function tableOffset(font: Buffer, tag: number): number | null {
  if (font.length < 12) return null;
  const tables = font.readUInt16BE(4);
  for (let i = 0; i < tables; i += 1) {
    const record = 12 + i * 16;
    if (font.readUInt32BE(record) === tag) return font.readUInt32BE(record + 8);
  }
  return null;
}

function readSubtable(font: Buffer, sub: number, out: Set<number>): void {
  if (sub <= 0 || sub + 4 > font.length) return;
  switch (font.readUInt16BE(sub)) {
    case 0:
      return readFormat0(font, sub, out);
    case 4:
      return readFormat4(font, sub, out);
    case 6:
      return readFormat6(font, sub, out);
    case 12:
      return readFormat12(font, sub, out);
    default:
      return;
  }
}

/** 格式 0：256 字节的码位→字形映射，只覆盖 U+0000–U+00FF */
function readFormat0(font: Buffer, sub: number, out: Set<number>): void {
  for (let code = 0; code < 256; code += 1) {
    if (sub + 6 + code < font.length && font.readUInt8(sub + 6 + code) !== 0) out.add(code);
  }
}

/** 格式 4：分段线性映射，CJK 字体主力；idRangeOffset 为 0 时用 idDelta 直接算 */
function readFormat4(font: Buffer, sub: number, out: Set<number>): void {
  const segments = font.readUInt16BE(sub + 6) / 2;
  const endBase = sub + 14;
  const startBase = endBase + segments * 2 + 2;
  const deltaBase = startBase + segments * 2;
  const rangeBase = deltaBase + segments * 2;

  for (let i = 0; i < segments; i += 1) {
    const end = font.readUInt16BE(endBase + i * 2);
    const start = font.readUInt16BE(startBase + i * 2);
    const delta = font.readInt16BE(deltaBase + i * 2);
    const rangeOffset = font.readUInt16BE(rangeBase + i * 2);
    if (start > end || start === 0xffff) continue;

    for (let code = start; code <= end; code += 1) {
      const glyph =
        rangeOffset === 0
          ? (code + delta) & 0xffff
          : glyphFromRange(font, rangeBase + i * 2 + rangeOffset + (code - start) * 2, delta);
      if (glyph !== 0) out.add(code);
    }
  }
}

/** idRangeOffset 指向的字形数组：一格 2 字节，取到 0 就是「这个码位没有字形」 */
function glyphFromRange(font: Buffer, address: number, delta: number): number {
  if (address + 2 > font.length) return 0;
  return (font.readUInt16BE(address) + delta) & 0xffff;
}

/** 格式 6：一段连续码位的映射表 */
function readFormat6(font: Buffer, sub: number, out: Set<number>): void {
  const first = font.readUInt16BE(sub + 6);
  const count = font.readUInt16BE(sub + 8);
  for (let i = 0; i < count; i += 1) {
    if (sub + 10 + i * 2 + 2 <= font.length && font.readUInt16BE(sub + 10 + i * 2) !== 0) out.add(first + i);
  }
}

/** 格式 12：分段映射，补充平面（U+10000 以上）只能靠它 */
function readFormat12(font: Buffer, sub: number, out: Set<number>): void {
  const groups = font.readUInt32BE(sub + 12);
  for (let i = 0; i < groups; i += 1) {
    const group = sub + 16 + i * 12;
    if (group + 12 > font.length) return;
    const start = font.readUInt32BE(group);
    const end = font.readUInt32BE(group + 4);
    if (font.readUInt32BE(group + 8) === 0) continue;
    for (let code = start; code <= end; code += 1) out.add(code);
  }
}
