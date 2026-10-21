import { site } from "../../config";

/** 日期展示格式：YYYY-MM-DD。时区由 site.timeZone 控制（默认 Asia/Shanghai，与 git 钩子一致） */
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone });

export function formatDate(date: Date): string {
  return fmt.format(date);
}

/** 归档时间轴用：MM-DD */
export function formatMonthDay(date: Date): string {
  return formatDate(date).slice(5);
}

/** 按站点时区取年份（归档分组与页脚年份用） */
export function getYear(date: Date): number {
  return Number(formatDate(date).slice(0, 4));
}
