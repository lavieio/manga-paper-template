/**
 * Vercel 项目配置（用 `vercel.ts` 而不是 `vercel.json`）。
 *
 * Vercel 只读仓根这份配置，而 `vercel.ts` **在构建时执行**、可以直接读环境变量：
 * 配了 remark42（`PUBLIC_REMARK42_HOST`）就把它的域名写进 CSP 白名单。
 * 静态的 `vercel.json` 做不到这件事（Vercel 也不插值 env），
 * 用 TS 就不用把任何生成物提交进 git。
 *
 * 同一份策略还会渲染成 `dist/_headers` 与 `dist/_redirects` 给 Cloudflare Pages / Netlify 用；
 * 唯一来源是 `src/utils/deploy-policy.ts`，devtools 的产物断言会核对两个出口一致。
 *
 * 刻意不装 `@vercel/config`：这里只用 config 的原始形状（与 `vercel.json` 同构），
 * 装了只是编辑器里多一层类型提示。
 */
import {
  buildHeaderRules,
  buildRedirectRules,
  toVercelHeaders,
  toVercelRedirects,
} from "./src/utils/deploy-policy.ts";
import { loadEnvFiles } from "./src/utils/load-env.ts";

// Vercel 构建时环境变量已经注入（优先级更高），这里负责本机 / 其他 CI 退回读 .env
loadEnvFiles();

export const config = {
  // 把部署设置写死，免得依赖面板里点的 preset；本文件即唯一来源
  framework: "astro",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  headers: toVercelHeaders(buildHeaderRules(process.env.PUBLIC_REMARK42_HOST)),
  redirects: toVercelRedirects(buildRedirectRules()),
};
