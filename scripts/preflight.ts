#!/usr/bin/env node
/**
 * 构建前必须通过的检查（`npm run build` 的第一环，失败即中止构建）。
 *
 * 目前只有一条：SITE_URL 必须是能上线的真实域名（规则见 src/utils/site-url.ts）。
 * 以后再加**必须**的检查就在 main() 里按同样模式追加——失败抛错即中止，
 * 消息原样打给用户（配置类错误只要那几行提示，不要堆栈）。
 *
 * 为什么卡在 `npm run build` 而不写在 astro.config.mjs：
 * 1. 部署平台（Vercel / Cloudflare Pages）跑的正是 `npm run build`，卡这一层才堵得住部署路径；
 *    直接 `npx astro build` 能绕过本脚本，但本地 devtools/verify-dist.ts 仍会从产物里扫出占位域名。
 * 2. 这个进程里没有 Astro 的命令上下文，能干净地区分「构建」与「本地 dev / preview」——
 *    后者必须放行，否则本地没配域名就什么都跑不起来。
 *
 * 用法：由 npm run build 自动调用，不需要手动跑。
 */
import { assertDeployableSiteUrl, loadSiteEnv } from "../src/utils/site-url.ts";

/** 检查失败：打印人看得懂的消息并中止构建 */
function fail(err: unknown): never {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

function main(): void {
  loadSiteEnv();

  try {
    console.log(`[site] SITE_URL = ${assertDeployableSiteUrl(process.env.SITE_URL)}`);
  } catch (err) {
    fail(err);
  }
}

main();
