/**
 * subset-font 与 fontverter 都没带类型声明（本体是 JS + wasm）。
 * 这里只补我们真正用到的部分，免得它们的调用悄悄退化成 any。
 */
declare module "subset-font" {
  interface SubsetOptions {
    /**
     * 产物格式。网页字体走 woff2；OG 卡片必须给 sfnt（TTF）——
     * Satori 只吃 TTF / OTF / WOFF，不吃 woff2。
     */
    readonly targetFormat?: "sfnt" | "truetype" | "woff" | "woff2";
    /** 要保留的 name ID（不传就按 harfbuzz 默认） */
    readonly preserveNameIds?: readonly number[];
    /** 只保留这些 OpenType 特性；不传等于全留（等宽连字是 Maple Mono 的卖点） */
    readonly keepFeatures?: readonly string[];
    /** 丢掉 hdmx/LTSH hinting（会小一点，但屏幕渲染会变糙） */
    readonly noHinting?: boolean;
  }

  export default function subsetFont(buffer: Uint8Array, text: string, options?: SubsetOptions): Promise<Buffer>;
}

declare module "fontverter" {
  type FontFormat = "sfnt" | "truetype" | "woff" | "woff2";

  const fontverter: {
    convert(buffer: Buffer, toFormat: FontFormat, fromFormat?: FontFormat): Promise<Buffer>;
    detectFormat(buffer: Buffer): FontFormat;
  };

  export default fontverter;
}
