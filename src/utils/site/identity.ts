/**
 * 站点身份配置的纯逻辑：套默认值、做构建期校验、归一成渲染用的固定形状。
 *
 * 这里只做类型 import，没有运行时依赖，能直接被 Node 原生类型剥离跑测试
 * （见 devtools/site-identity.test.ts）。读取用户配置与环境变量的入口仍是 src/config.ts。
 */
import type { FooterLink, SiteFooterConfig, SiteIdentityConfig } from "../../types/config";

export interface ResolvedFooterLink extends FooterLink {
  readonly external: boolean;
}

export interface ResolvedFooterConfig {
  readonly copyright: string;
  readonly links: readonly ResolvedFooterLink[];
}

export interface ResolvedSiteConfig {
  readonly name: string;
  readonly tagline: string;
  readonly author: string;
  readonly bio: string;
  readonly lang: string;
  readonly timeZone: string;
  readonly favicon: string;
  readonly sealText: string;
  readonly footer: ResolvedFooterConfig;
}

export const DEFAULT_COPYRIGHT = "Copyright © {year} | All rights reserved.";

const DEFAULT_LANG = "zh-CN";
const DEFAULT_TIME_ZONE = "Asia/Shanghai";
const DEFAULT_FAVICON = "/favicon.svg";
const HTTP_URL = /^https?:\/\//i;
/** BCP 47 的宽松形态：语言 + 可选子标签；拒绝 zh_CN 这类下划线写法 */
const LANGUAGE_TAG = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i;

function requiredText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`[site] ${field} 不能为空`);
  return trimmed;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** 印章只放一个字：取第一个码位，避免页头 30px 方章与 OG logo 溢出 */
function firstCharacter(value: string): string {
  return [...value.trim()][0] ?? "";
}

function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    throw new Error(`[site] timeZone 不是合法的 IANA 时区：「${timeZone}」`);
  }
}

function resolveFooter(footer: SiteFooterConfig | undefined): ResolvedFooterConfig {
  const copyright = optionalText(footer?.copyright) ?? DEFAULT_COPYRIGHT;
  const links = (footer?.links ?? []).map((link, index) => {
    const label = requiredText(link.label, `footer.links[${index}].label`);
    const href = requiredText(link.href, `footer.links[${index}].href`);
    if (/\s/.test(href)) {
      throw new Error(`[site] footer.links[${index}].href 不能包含空白字符：「${href}」`);
    }
    return { label, href, external: HTTP_URL.test(href) };
  });

  return { copyright, links };
}

export function resolveSiteConfig(site: SiteIdentityConfig): ResolvedSiteConfig {
  const name = requiredText(site.name, "name");
  const lang = optionalText(site.lang) ?? DEFAULT_LANG;
  if (!LANGUAGE_TAG.test(lang)) {
    throw new Error(`[site] lang 不是合法的 BCP 47 语言标签：「${lang}」（应形如 zh-CN / en-US）`);
  }

  const timeZone = optionalText(site.timeZone) ?? DEFAULT_TIME_ZONE;
  assertTimeZone(timeZone);

  const favicon = optionalText(site.favicon) ?? DEFAULT_FAVICON;
  if (/\s/.test(favicon)) throw new Error(`[site] favicon 不能包含空白字符：「${favicon}」`);

  return {
    name,
    tagline: requiredText(site.tagline, "tagline"),
    author: requiredText(site.author, "author"),
    bio: requiredText(site.bio, "bio"),
    lang,
    timeZone,
    favicon,
    sealText: firstCharacter(optionalText(site.sealText) ?? name),
    footer: resolveFooter(site.footer),
  };
}
