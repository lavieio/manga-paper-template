/**
 * 站点语言标签的两个渲染出口：
 * - `og:locale` 用 `language_TERRITORY`（例如 zh_CN / en_US）；
 * - RSS `<language>` 用常见的小写语言标签（例如 zh-cn / en-us）。
 *
 * 只做字符串归一，不依赖配置或运行时环境，便于单测。
 */

/** 只有语言、没有地区时，OG locale 的常用兜底 */
const OG_LOCALE_FALLBACKS: Readonly<Record<string, string>> = {
  zh: "zh_CN",
  en: "en_US",
  ja: "ja_JP",
  ko: "ko_KR",
  fr: "fr_FR",
  de: "de_DE",
  es: "es_ES",
  pt: "pt_BR",
  ru: "ru_RU",
};

/**
 * BCP 47 → Open Graph locale。
 * `zh-CN` → `zh_CN`；`zh-Hans-CN` → `zh_CN`（取最后一个两字母地区）；
 * `en` → `en_US`；未知语言原样返回。
 */
export function toOgLocale(lang: string): string {
  const value = lang.trim();
  if (!value) return OG_LOCALE_FALLBACKS.zh;

  const parts = value.split("-").filter(Boolean);
  const language = parts[0].toLowerCase();
  const region = parts.length > 1 ? parts[parts.length - 1] : "";
  if (/^[a-z]{2}$/i.test(region)) return `${language}_${region.toUpperCase()}`;

  return OG_LOCALE_FALLBACKS[language] ?? language;
}

/** RSS 2.0 的 `<language>`：统一小写；空值回退 `zh-cn` */
export function toRssLanguage(lang: string): string {
  return lang.trim().toLowerCase() || "zh-cn";
}
