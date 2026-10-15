/**
 * 用户配置的类型契约。
 *
 * 使用者只需要改仓根的 `manga-paper.config.ts`；这个文件只放类型与 `defineConfig()`，
 * 不含任何运行时逻辑——套默认值、合并 env、固定对外形状是 `src/config.ts` 的事。
 */

/** 站点主人的一个入口（GitHub / 邮箱 / 社交账号 / 友链…） */
export interface Social {
  /** 显示文字 */
  readonly label: string;
  /** 跳转地址：`https://` 外链、`mailto:`，或以 `/` 开头的站内路径 */
  readonly url: string;
  /**
   * 图标，三种写法都认（判定见 `src/utils/social/links.ts` 的 `resolveIcon()`）：
   * - 内置名：`github` / `x` / `weibo` / `mail` / `rss` …（完整清单见 `SOCIAL_ICONS`）
   * - 站内图片：`/icons/weibo.svg`（文件放 `public/icons/` 下）
   * - 外链图片：`https://example.com/icon.png`
   *
   * 不填或名字不认识 → 通用外链图标。
   */
  readonly icon?: string;
  /** 主入口（墨底纸字）。一条里最多给一个；默认 false */
  readonly primary?: boolean;
}

export interface MangaPaperConfig {
  /** 站点身份与文案 */
  readonly site: {
    readonly name: string;
    readonly tagline: string;
    readonly author: string;
    /** 一句话简介：关于页 meta description 的兜底，也是站点默认分享卡的第二行 */
    readonly bio: string;
  };
  /** 内容组织 */
  readonly posts: {
    /** 列表分页每页篇数 */
    readonly perPage: number;
    /** 首页「最近更新」条数 */
    readonly recentCount: number;
  };
  /**
   * 站点主人的入口列表，顺序即展示顺序。
   *
   * 只有首页贴纸条用它；RSS 由模板固定追加在末尾，不写在这里
   * （见 `src/config.ts` 的 `homeSocials`）。
   */
  readonly socials: readonly Social[];
}

/** 与 Astro 的 `defineConfig` 同一个手势：只为类型提示与将来的配置校验留一个入口 */
export function defineConfig(config: MangaPaperConfig): MangaPaperConfig {
  return config;
}
