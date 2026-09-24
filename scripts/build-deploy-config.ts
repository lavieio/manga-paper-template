#!/usr/bin/env node
/**
 * 生成 Cloudflare Pages / Netlify 要的部署配置（构建链，plan §13）：
 * - `dist/_headers`：安全响应头（CSP 白名单按 `.env` 现算）；
 * - `dist/_redirects`：真 301（`/posts/ → /posts/1`）。
 *
 * 为什么是生成而不是手写：策略里有一半要跟着 `.env` 走（remark42 的域名），静态文件做不到。
 * Vercel 那边不需要生成物：仓根的 `vercel.ts` 在 Vercel 构建时执行、自己读环境变量，
 * 同一份策略由 `src/utils/deploy-policy.ts` 渲染。
 *
 * 挂在 `npm run build` 的 `astro build` 之后（Astro 会清空 dist/）。
 * 也可以单独跑 `node scripts/build-deploy-config.ts` 看生成结果。
 */
import { existsSync, writeFileSync } from "node:fs";
import { loadEnvFiles } from "../src/utils/load-env.ts";
import {
  buildHeaderRules,
  buildRedirectRules,
  cspOrigin,
  renderHeadersFile,
  renderRedirectsFile,
} from "../src/utils/deploy-policy.ts";

const DIST = "dist";
const DIST_HEADERS = `${DIST}/_headers`;
const DIST_REDIRECTS = `${DIST}/_redirects`;

loadEnvFiles();

if (!existsSync(DIST)) {
  console.error(`[deploy] ${DIST}/ 不存在（先跑 astro build），未生成 ${DIST_HEADERS} / ${DIST_REDIRECTS}`);
  process.exit(1);
}

const rawRemark42 = process.env.PUBLIC_REMARK42_HOST;
const remark42Origin = cspOrigin(rawRemark42);

if (rawRemark42?.trim() && !remark42Origin) {
  console.warn(`[deploy] PUBLIC_REMARK42_HOST 不是合法的绝对 URL（"${rawRemark42}"），CSP 未放行它`);
}

writeFileSync(DIST_HEADERS, renderHeadersFile(buildHeaderRules(rawRemark42)));
writeFileSync(DIST_REDIRECTS, renderRedirectsFile(buildRedirectRules()));

console.log(
  `[deploy] 已生成 ${DIST_HEADERS} 与 ${DIST_REDIRECTS}` +
    (remark42Origin ? `，CSP 已放行 remark42：${remark42Origin}` : "，未配置 remark42"),
);
