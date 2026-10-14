/**
 * 布尔开关型环境变量解析。
 * 约定：`1` / `true` / `yes` / `on`（大小写不敏感）为开，其余（含未配置、空值）一律为关。
 * 与全站「未配置即关闭」一致：可选能力绝不因为一个空值或拼写错误就意外打开。
 */
const TRUTHY = new Set(["1", "true", "yes", "on"]);

export function isEnabledFlag(value: string | undefined): boolean {
  return TRUTHY.has((value ?? "").trim().toLowerCase());
}
