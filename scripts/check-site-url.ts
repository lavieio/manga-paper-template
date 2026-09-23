#!/usr/bin/env node
/**
 * 构建期闸门：SITE_URL 必须是能上线的真实域名（规则见 src/utils/site-url.ts）。
 *
 * 为什么卡在 `npm run build` 而不写在 astro.config.mjs：
 * 1. 部署平台（Vercel / Cloudflare Pages）跑的正是 `npm run build`，卡这一层就堵住了部署路径；
 *    直接 `npx astro build` 能绕过本脚本，但 `npm run verify` 仍会从产物里扫出占位域名。
 * 2. 这个进程里没有 Astro 的命令上下文，能干净地区分「构建」与「本地起的 dev / preview」——
 *    后者必须放行，否则本地没配域名就啥也跑不起来。
 *
 * 用法：由 npm run build 自动调用，不需要手动跑。
 */
import { assertDeployableSiteUrl, loadSiteEnv } from "../src/utils/site-url.ts";

loadSiteEnv();

// 配置类的错误只需要人看得懂的那句话，不需要堆栈
try {
  console.log(`[site] SITE_URL = ${assertDeployableSiteUrl(process.env.SITE_URL)}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
