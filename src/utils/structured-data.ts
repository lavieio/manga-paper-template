import type { SiteConfig } from "../config";

/**
 * JSON-LD 结构化数据（plan §2 可发现性）：首页 WebSite + Blog、公开文章页 BlogPosting。
 *
 * 私密文章的标题与正文按设计不进明文，那几页一概不传 structuredData（判断权在调用方）。
 * 序列化必须走 serializeJsonLd()：JSON.stringify 不转义 `<`，
 * 标题里只要出现 `</script>` 就能从脚本标签里跑出来变成真标签。
 */

const SCHEMA_CONTEXT = "https://schema.org";
const LANGUAGE = "zh-CN";

/** 站点身份：各节点共用的 name / url / author */
export interface JsonLdSite {
  /** 站点根 URL（绝对地址，含结尾斜杠） */
  readonly url: string;
  readonly name: string;
  readonly tagline: string;
  readonly author: string;
}

/** 文章侧字段（调用方负责归一：日期给 Date、URL 给绝对地址） */
export interface JsonLdPost {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly published: Date;
  readonly updated?: Date;
  readonly section?: string;
  readonly keywords: readonly string[];
}

/** 节点通用形状：字段随 @type 变化，这里只约束必须带 @type */
export interface JsonLdNode {
  readonly "@type": string;
  readonly [field: string]: unknown;
}

/** 把 Astro.site 与站点配置拼成 JSON-LD 用的站点身份 */
export function siteFacts(
  config: Pick<SiteConfig, "name" | "tagline" | "author">,
  siteUrl: URL | undefined,
): JsonLdSite {
  if (!siteUrl) throw new Error("[structured-data] 缺少 site 配置（SITE_URL 未生效），无法生成 JSON-LD");

  return {
    url: new URL("/", siteUrl).href,
    name: config.name,
    tagline: config.tagline,
    author: config.author,
  };
}

export function websiteJsonLd(site: JsonLdSite): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.tagline,
    inLanguage: LANGUAGE,
    publisher: person(site.author),
  };
}

export function blogJsonLd(site: JsonLdSite): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Blog",
    name: site.name,
    url: site.url,
    description: site.tagline,
    inLanguage: LANGUAGE,
    author: person(site.author),
    publisher: person(site.author),
  };
}

export function blogPostingJsonLd(post: JsonLdPost, site: JsonLdSite): JsonLdNode {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: post.url,
    mainEntityOfPage: post.url,
    datePublished: iso(post.published),
    dateModified: iso(post.updated ?? post.published),
    inLanguage: LANGUAGE,
    author: person(site.author),
    publisher: person(site.author),
    // 可选字段给 undefined：JSON.stringify 会整个丢掉该键，不用手工拼对象
    articleSection: post.section,
    keywords: post.keywords.length > 0 ? post.keywords.join(", ") : undefined,
  };
}

/** datePublished / dateModified 用 ISO 8601（schema.org 的 date 就是 ISO 8601） */
function iso(date: Date): string {
  return date.toISOString();
}

function person(name: string): JsonLdNode {
  return { "@type": "Person", name };
}

/** 切断 `</script>` 与 HTML 实体解析；行分隔符在 JS 字符串里也非法，一并转掉 */
const SCRIPT_ESCAPES: Readonly<Record<string, string>> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const UNSAFE_IN_SCRIPT = /[<>&\u2028\u2029]/g;

export function serializeJsonLd(data: JsonLdNode | readonly JsonLdNode[]): string {
  return JSON.stringify(data).replace(UNSAFE_IN_SCRIPT, (char) => SCRIPT_ESCAPES[char] ?? char);
}
