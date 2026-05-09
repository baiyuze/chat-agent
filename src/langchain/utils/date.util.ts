export function getCurrentDateTimeText() {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.TZ ?? "Asia/Shanghai",
  }).format(new Date());
}
