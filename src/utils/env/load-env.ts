/**
 * 把 `.env` 读进 `process.env`。
 *
 * 为什么需要它：Astro 文档明确「.env files are not loaded inside configuration files」，
 * 而 markdown 处理器（src/plugins/*）跑在 Vite 的 define 替换之外——实测那里
 * `import.meta.env` 是 undefined、`process.env` 也看不到 .env 的值。
 * 于是所有构建期需要读 .env 的地方（astro.config.mjs / scripts/preflight.ts / markdown 插件）
 * 都先自己加载一遍，保证「构建期开关放 .env」这条约定到处都成立。
 *
 * 优先级按 Vite：shell 里已存在的变量最高（loadEnvFile 不覆盖已有值，所以
 * `SITE_URL=... npm run build` 这类临时覆盖照常生效），其次 .env.local，最后 .env。
 */
import { join } from "node:path";

export function loadEnvFiles(cwd: string = process.cwd()): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(join(cwd, file));
    } catch {
      // 文件不存在属正常情况（部署平台只注入环境变量，没有 .env）
    }
  }
}