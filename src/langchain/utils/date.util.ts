export function getTodayText() {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "long",
    timeZone: process.env.TZ ?? "Asia/Shanghai",
  }).format(new Date());
}
