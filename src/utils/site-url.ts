/**
 * SITE_URL 闸门。SITE_URL 是 canonical / sitemap / RSS 的唯一真源（plan §2）。
 *
 * 三件事：
 * 1. `loadSiteEnv()`：把 .env 读进 process.env。Astro 文档明确「.env 不会被加载进配置文件」，
 *    不自己读一遍的话，astro.config.mjs 里的 process.env.SITE_URL 永远看不到 .env 的值——
 *    这正是「.env 里明明配了域名，产物里还是 your-domain.com」的根因。
 * 2. `siteUrlOrPlaceholder()`：给 astro.config.mjs 用。有配置就校验格式（Astro 的 canonical
 *    走 `new URL(pathname, site)`，非法值会静默产出坏链接），没配置就退回占位域名，
 *    这样 `astro dev` / `preview` 不会被「还没配域名」挡住。
 * 3. `assertDeployableSiteUrl()`：给构建前检查 scripts/preflight.ts 用。缺失、空值、
 *    非法 URL、占位域名一律拒绝；而 `npm run build` 正是 Vercel / Cloudflare Pages 的入口。
 */
import { join } from "node:path";

/** .env.example 里的示例域名：留着它就等于没配 SITE_URL */
export const PLACEHOLDER_SITE_URL = "https://your-domain.com";

/** 产物扫描用的裸域名形式（verify 的断言用它，能把裸写域名的场景一起扫到） */
export const PLACEHOLDER_HOST = new URL(PLACEHOLDER_SITE_URL).host;

const HINT = [
  "  把 .env 里的 SITE_URL 改成你的真实域名（含 https://）。",
  "  只想本地构建预览，可填 http://localhost:4321。",
  "  canonical / sitemap / RSS 全用它，指向占位域名上线是不可逆的 SEO 伤害。",
].join("\n");

/**
 * 把 .env 读进 process.env。
 *
 * 优先级按 Vite：shell 里已存在的变量最高（loadEnvFile 不覆盖已有值，所以
 * `SITE_URL=... npm run build` 这类临时覆盖照常生效），其次 .env.local，最后 .env。
 */
export function loadSiteEnv(cwd: string = process.cwd()): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(join(cwd, file));
    } catch {
      // 文件不存在属正常情况（部署平台只注入环境变量，没有 .env）
    }
  }
}

function assertHttpUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`[site] SITE_URL 不是合法的绝对 URL："${value}"（应形如 https://example.com）\n${HINT}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`[site] SITE_URL 只支持 http/https，当前是 "${url.protocol}"\n${HINT}`);
  }
}

/**
 * 给 astro.config.mjs 用：有配置就校验格式，没配置就退回占位域名。
 * dev / preview 因此不会被「还没配域名」挡住，页面照常起。
 */
export function siteUrlOrPlaceholder(value: string | undefined): string {
  const configured = (value ?? "").trim();
  if (!configured) return PLACEHOLDER_SITE_URL;
  assertHttpUrl(configured);
  return configured;
}

/**
 * 给构建期闸门用：缺失、空值、非法 URL、示例占位域名一律抛错。
 * @param value 原始 env 值（未设、空串、纯空白都算未配置）
 */
export function assertDeployableSiteUrl(value: string | undefined): string {
  const configured = (value ?? "").trim();
  if (!configured) throw new Error(`[site] 未配置 SITE_URL，拒绝构建：\n${HINT}`);
  assertHttpUrl(configured);
  if (configured === PLACEHOLDER_SITE_URL) {
    throw new Error(`[site] SITE_URL 还是示例占位域名，拒绝构建：\n${HINT}`);
  }
  return configured;
}
