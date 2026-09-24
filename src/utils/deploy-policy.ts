/**
 * 部署层策略的唯一来源（plan §13）：安全响应头 + 重定向。
 *
 * 同一份策略有两个出口，因为两个平台看的地方不同：
 * - `dist/_headers`、`dist/_redirects`：Cloudflare Pages / Netlify 读**发布目录**里的这两个文件，
 *   由 `scripts/build-deploy-config.ts` 生成；
 * - `vercel.ts`：Vercel 只认仓根的配置文件，但它支持 TypeScript——那份**在 Vercel 构建时执行**，
 *   直接读环境变量，所以仓库里不需要提交任何生成物。
 *
 * 响应头要跟着 env 走：配了 remark42（`PUBLIC_REMARK42_HOST`）就把那个域名加进 CSP 白名单——
 * 静态文件自己没办法知道这件事，所以 CF 侧必须生成而不是手写。
 * CSP 目前是 Report-Only（只上报不拦），观察期结束、白名单补齐后再去掉 -Report-Only 强制。
 */
export const REPORT_ONLY_CSP = "Content-Security-Policy-Report-Only";
export const ENFORCING_CSP = "Content-Security-Policy";
/** 带内容哈希的资源目录：可以永久缓存 */
export const ASTRO_ASSETS_SOURCE = "/_astro/*";
export const GLOBAL_SOURCE = "/*";
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
/** 安全头里必须始终存在的几项（devtools 的产物断言也按这个清单核） */
export const REQUIRED_HEADERS = [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  REPORT_ONLY_CSP,
] as const;

/**
 * 字体 CDN 与 src/layouts/Base.astro 的 FONT_CDN 同源。
 * 它是 CSP 必须放行的外部来源（stylesheet + font + preconnect）；
 * 改了 Base.astro 那边忘了改这里，devtools 的产物断言会红（它拿产物里的真实来源对白名单）。
 */
const FONT_CDN = "https://fontsapi.zeoseven.com";

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
 * @param remark42Host 原始 env 值；空值或非法 URL 都不会被写进白名单（构建脚本会告警）
 */
export function buildHeaderRules(remark42Host: string | undefined): HeaderRule[] {
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
        { name: REPORT_ONLY_CSP, value: buildCsp(cspOrigin(remark42Host)) },
      ],
    },
    {
      source: ASTRO_ASSETS_SOURCE,
      headers: [{ name: "Cache-Control", value: IMMUTABLE_CACHE }],
    },
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
 * 指令集是「产物真实需要什么」的清单：
 * - `font-src` / `style-src` / `connect-src`：字体 CDN（styles.css 走 style-src，字体文件走 font-src，
 *   `preconnect` 走 connect-src）；
 * - `img-src https:`：文章里的外链图来自任意 https 域名（构建期只探测尺寸，不自托管）；
 * - `worker-src` + `'wasm-unsafe-eval'`：Pagefind 用 worker + WebAssembly 建索引；
 * - `'unsafe-inline'`：Astro 把小于 4KB 的客户端脚本内联进 HTML，且随内容变化；
 * - remark42：脚本、WebSocket 与 iframe 分别要 script-src / connect-src / frame-src。
 */
function buildCsp(remark42Origin: string | null): string {
  const remark42 = remark42Origin ? ` ${remark42Origin}` : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${remark42}`,
    `style-src 'self' 'unsafe-inline' ${FONT_CDN}`,
    `font-src 'self' ${FONT_CDN}`,
    "img-src 'self' data: https:",
    `connect-src 'self' ${FONT_CDN}${remark42}`,
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
  "# 配了 remark42（PUBLIC_REMARK42_HOST）时，它的域名已自动写进 script-src / connect-src / frame-src。",
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
   分页第一页住在 /posts/1（plan §6）：/posts/ 是 Astro 不再生成的旧地址，
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
