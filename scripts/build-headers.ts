#!/usr/bin/env node
/**
 * 生成 Cloudflare Pages / Netlify 用的安全响应头（构建链，plan §13）。
 *
 * 为什么是生成而不是手写：CSP 白名单跟着 `.env` 走——配了 remark42
 * （`PUBLIC_REMARK42_HOST`）就得放行它的域名，静态文件没法自己知道这件事。
 * Vercel 那边不需要生成物：仓根的 `vercel.ts` 在 Vercel 构建时执行、自己读环境变量。
 *
 * 挂在 `npm run build` 的 `astro build` 之后（Astro 会清空 dist/）。
 * 也可以单独跑 `node scripts/build-headers.ts` 看生成结果。
 */
import { existsSync, writeFileSync } from "node:fs";
import { loadEnvFiles } from "../src/utils/load-env.ts";
import { buildHeaderRules, cspOrigin, renderHeadersFile } from "../src/utils/header-policy.ts";

const DIST = "dist";
const DIST_HEADERS = `${DIST}/_headers`;

loadEnvFiles();

if (!existsSync(DIST)) {
  console.error(`[headers] ${DIST}/ 不存在（先跑 astro build），未生成 ${DIST_HEADERS}`);
  process.exit(1);
}

const rawRemark42 = process.env.PUBLIC_REMARK42_HOST;
const remark42Origin = cspOrigin(rawRemark42);

if (rawRemark42?.trim() && !remark42Origin) {
  console.warn(`[headers] PUBLIC_REMARK42_HOST 不是合法的绝对 URL（"${rawRemark42}"），CSP 未放行它`);
}

writeFileSync(DIST_HEADERS, renderHeadersFile(buildHeaderRules(rawRemark42)));

console.log(
  `[headers] 已生成 ${DIST_HEADERS}` +
    (remark42Origin ? `，CSP 已放行 remark42：${remark42Origin}` : "，未配置 remark42"),
);
