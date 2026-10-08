/**
 * 部署层策略的唯一来源：安全响应头 + 重定向。
 *
 * 同一份策略有两个出口，因为两个平台看的地方不同：
 * - `dist/_headers`、`dist/_redirects`：Cloudflare Pages / Netlify 读**发布目录**里的这两个文件，
 *   由 `scripts/build-deploy-config.ts` 生成；
 * - `vercel.ts`：Vercel 只认仓根的配置文件，但它支持 TypeScript——那份**在 Vercel 构建时执行**，
 *   直接读环境变量，所以仓库里不需要提交任何生成物。
 *
 * 响应头要跟着 env 走：配了 remark42（`PUBLIC_REMARK42_HOST`）就把那个域名加进 CSP 白名单；
 * 配了 GA4（`PUBLIC_GA_MEASUREMENT_ID`）就放行 gtag.js 与采集端点——
 * 静态文件自己没办法知道这件事，所以 CF 侧必须生成而不是手写。
 * CSP 目前是 Report-Only（只上报不拦），观察期结束、白名单补齐后再去掉 -Report-Only 强制。
 */
import { GA_COLLECT_ORIGINS, GA_SCRIPT_ORIGIN, parseGaMeasurementId } from "./analytics.ts";

export const REPORT_ONLY_CSP = "Content-Security-Policy-Report-Only";
export const ENFORCING_CSP = "Content-Security-Policy";
/** 带内容哈希的资源目录：可以永久缓存 */
export const ASTRO_ASSETS_SOURCE = "/_astro/*";
/** 自托管字体子集：文件名带内容哈希 */
export const FONT_ASSETS_SOURCE = "/fonts/*";
/**
 * Pagefind 的索引与分片：文件名由**内容**算出来（实测：给一篇文章加一句话重编，
 * 这 19 个文件的名字全变、且没有任何同名文件换了内容），搜索时由 `pagefind-entry.json`
 * 按哈希去取，所以可以永久缓存。
 * **只有这两层**——`pagefind.js`、`pagefind-ui.css`、`pagefind-worker.js` 与
 * `pagefind-entry.json` 是固定文件名，升级 Pagefind 就换内容，immutable 会让老浏览器
 * 长期用旧运行时（可能与新索引格式不兼容），那些留给平台默认的 `must-revalidate`。
 */
export const PAGEFIND_HASHED_SOURCES = ["/pagefind/index/*", "/pagefind/fragment/*"] as const;
/**
 * 所有可以 `immutable` 的路径：响应头的两个出口（`dist/_headers` 与 `vercel.ts`）
 * 与产物断言共用这一份，新增哈希目录只改这里，免得策略与断言漂移。
 */
export const IMMUTABLE_SOURCES: readonly string[] = [ASTRO_ASSETS_SOURCE, FONT_ASSETS_SOURCE, ...PAGEFIND_HASHED_SOURCES];
export const GLOBAL_SOURCE = "/*";
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
/** 安全头里必须始终存在的几项（产物断言按这个清单核） */
export const REQUIRED_HEADERS = [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  REPORT_ONLY_CSP,
] as const;

export interface HeaderEntry {
  readonly name: string;
  readonly value: string;
}

/** 一条 `_headers` 规则：路径（splat 写法）+ 该路径下的头 */
export interface HeaderRule {
  readonly source: string;
  readonly headers: readonly HeaderEntry[];
}

/** Vercel 写的形状（`vercel.ts` 的 `headers` 字段就是它，只是路径用正则写法） */
export interface VercelHeaderRule {
  readonly source: string;
  readonly headers: readonly { readonly key: string; readonly value: string }[];
}

/**
 * 站点安全头 + 按 env 定制的 CSP。
 * @param env 原始 env 值；空值或非法值都不会被写进白名单（构建脚本会告警）
 */
export interface DeployPolicyEnv {
  readonly remark42Host?: string;
  readonly gaMeasurementId?: string;
}

export function buildHeaderRules(env: DeployPolicyEnv): HeaderRule[] {
  const gaEnabled = parseGaMeasurementId(env.gaMeasurementId) !== null;
  return [
    {
      source: GLOBAL_SOURCE,
      headers: [
        { name: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { name: "X-Content-Type-Options", value: "nosniff" },
        { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { name: "X-Frame-Options", value: "DENY" },
        {
          name: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
        },
        {
          name: REPORT_ONLY_CSP,
          value: buildCsp({ remark42Origin: cspOrigin(env.remark42Host), gaEnabled }),
        },
      ],
    },
    ...IMMUTABLE_SOURCES.map((source) => ({
      source,
      headers: [{ name: "Cache-Control", value: IMMUTABLE_CACHE }],
    })),
  ];
}

/** env 里可能是 `https://host/`、带路径或带端口；CSP 只认 origin */
export function cspOrigin(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * 指令集是「产物真实需要什么」的清单（字体已自托管，没有第三方来源）：
 * - `img-src https:`：文章里的外链图来自任意 https 域名（构建期只探测尺寸，不自托管）；
 * - `worker-src` + `'wasm-unsafe-eval'`：Pagefind 用 worker + WebAssembly 建索引；
 * - `'unsafe-inline'`：Astro 把小于 4KB 的客户端脚本内联进 HTML，且随内容变化；
 * - remark42：脚本、WebSocket 与 iframe 分别要 script-src / connect-src / frame-src；
 * - GA4：gtag.js 要 script-src，采集端点要 connect-src（img 向 `https:` 已放开）。
 */
interface CspOrigins {
  readonly remark42Origin: string | null;
  readonly gaEnabled: boolean;
}

function buildCsp({ remark42Origin, gaEnabled }: CspOrigins): string {
  const remark42 = remark42Origin ? ` ${remark42Origin}` : "";
  const gaScript = gaEnabled ? ` ${GA_SCRIPT_ORIGIN}` : "";
  const gaCollect = gaEnabled ? ` ${GA_COLLECT_ORIGINS.join(" ")}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${gaScript}${remark42}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https:",
    `connect-src 'self'${gaCollect}${remark42}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (remark42Origin) directives.push(`frame-src 'self' ${remark42Origin}`);
  return directives.join("; ");
}

const HEADERS_DOC = [
  "# 安全响应头（Cloudflare Pages / Netlify 语法）",
  "# ⚠️ 本文件由 `node scripts/build-deploy-config.ts` 生成，改这里会被下次构建覆盖——",
  "#    要改策略请改 src/utils/deploy-policy.ts。",
  "# Vercel 不认这个文件：同一份策略在仓根的 vercel.ts 里（那份在 Vercel 构建时执行，不入 git）。",
  "#",
  "# CSP 目前是 Report-Only：只往控制台发报告、不拦任何资源。部署后观察报告、补齐白名单，",
  "# 再去掉 -Report-Only 强制。script-src 留 'unsafe-inline' 是因为 Astro 会把小于 4KB 的",
  "# 客户端脚本内联进 HTML 且随内容变化，写死 hash 必然漂移；更严的做法是 Astro 内置 security.csp。",
  "# 配了 remark42（PUBLIC_REMARK42_HOST）时，它的域名已自动写进 script-src / connect-src / frame-src；",
  "# 配了 GA4（PUBLIC_GA_MEASUREMENT_ID）时，gtag.js 域名进 script-src、采集端点进 connect-src。",
  "# 内容哈希命名的产物（/_astro/*、/fonts/*、/pagefind/index|fragment/*）配了 immutable 长缓存；",
  "# 其余路径（HTML、/pagefind 下固定文件名的运行时）不写规则，走平台默认。",
].join("\n");

/** `_headers`：路径行 + 两个空格缩进的头行 */
export function renderHeadersFile(rules: readonly HeaderRule[]): string {
  const body = rules
    .map((rule) => [rule.source, ...rule.headers.map((entry) => `  ${entry.name}: ${entry.value}`)].join("\n"))
    .join("\n\n");

  return `${HEADERS_DOC}\n\n${body}\n`;
}

export function toVercelHeaders(rules: readonly HeaderRule[]): VercelHeaderRule[] {
  return rules.map((rule) => ({
    source: toVercelSource(rule.source),
    headers: rule.headers.map((entry) => ({ key: entry.name, value: entry.value })),
  }));
}

/* ── 重定向 ─────────────────────────────────────────────────────────────
   分页第一页住在 /posts/1：/posts/ 是 Astro 不再生成的旧地址，
   用真 301 收口，免得它变成 404 或者和第一页内容重复。 */

/** 文章列表第一页的地址（`[...page].astro` 改成 `[page].astro` 后就住在这里） */
export const POSTS_FIRST_PAGE = "/posts/1";
const MOVED_PERMANENTLY = 301;

export interface RedirectRule {
  readonly source: string;
  readonly destination: string;
  readonly status: number;
}

export function buildRedirectRules(): RedirectRule[] {
  return [{ source: "/posts/", destination: POSTS_FIRST_PAGE, status: MOVED_PERMANENTLY }];
}

const REDIRECTS_DOC = [
  "# 真 301（Cloudflare Pages / Netlify 的 _redirects 语法）",
  "# ⚠️ 本文件由 `node scripts/build-deploy-config.ts` 生成，改这里会被下次构建覆盖——",
  "#    要改规则请改 src/utils/deploy-policy.ts；Vercel 那份在仓根的 vercel.ts 里。",
  "# 分页第一页的正式地址是 /posts/1，/posts/ 只是旧地址。",
].join("\n");

/** `_redirects`：`源 目标 状态码`，一行一条 */
export function renderRedirectsFile(rules: readonly RedirectRule[]): string {
  const body = rules.map((rule) => `${rule.source} ${rule.destination} ${rule.status}`).join("\n");
  return `${REDIRECTS_DOC}\n\n${body}\n`;
}

export function toVercelRedirects(rules: readonly RedirectRule[]): {
  readonly source: string;
  readonly destination: string;
  readonly statusCode: number;
}[] {
  return rules.map((rule) => ({
    source: toVercelSource(rule.source),
    destination: rule.destination,
    statusCode: rule.status,
  }));
}

/** splat → Vercel 的正则写法（语义一样，只是语法不同） */
export function toVercelSource(source: string): string {
  return source.split("*").join("(.*)");
}
