/**
 * 访问统计（GA4）与搜索引擎验证（GSC）的**纯逻辑**。
 *
 * 只放不依赖运行时的常量与校验函数，因此有两类消费者：
 * - 客户端 / 构建期（`src/config.ts` 读 `import.meta.env`）；
 * - Node 构建脚本（`src/utils/deploy-policy.ts` 读 `process.env`）。
 * GA 域名与 ID 校验必须两边共用，否则「组件加载了 gtag、CSP 却没放行」会白白上报一堆违规。
 */

/**
 * GA4 Measurement ID：`G-` + 大写字母数字。
 * 大小写不敏感地接受（有人从文档里复制到小写），但**不改写**原值——ID 由用户原样保留。
 */
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/i;

/** gtag.js 脚本来源（`script-src`） */
export const GA_SCRIPT_ORIGIN = "https://www.googletagmanager.com";

/**
 * GA 采集端点（`connect-src`）：
 * `google-analytics.com` 是主端点，`region1.*` 是分区端点，两个都可能被命中。
 */
export const GA_COLLECT_ORIGINS = [
  "https://www.google-analytics.com",
  "https://region1.google-analytics.com",
] as const;

/**
 * 把原始 env 值收敛成合法 GA4 ID：缺失、空白、格式不对都返回 `null`。
 * 未配置就整块不渲染（与 remark42 的「两项缺一即不渲染」同款，绝不留空壳）。
 */
export function parseGaMeasurementId(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return GA_ID_PATTERN.test(trimmed) ? trimmed : null;
}
