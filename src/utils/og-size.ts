/**
 * OG 卡片画布尺寸：1200×630，社交卡片通用的 1.91:1。
 *
 * 单独一个文件的原因：`share-image.ts` 要用它写 `og:image:width/height`，
 * 而那个文件要能被 Node 直接单测（走 `node --test`），所以不能把
 * `import.meta.env`（src/config.ts）拉进依赖图——这里只放纯常量，
 * 依赖它的地方用**带扩展名**的相对导入，Node 才解析得到。
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
