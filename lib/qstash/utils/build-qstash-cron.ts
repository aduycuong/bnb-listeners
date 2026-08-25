import { normalizeCronScheduleValue } from "@/lib/common/cron-presets";

export function buildQstashCron(
  cronConfig: Record<string, unknown> | null | undefined
): string | null {
  const { cron, timezone } = normalizeCronScheduleValue(cronConfig);
  const trimmedCron = cron.trim();

  if (!trimmedCron) {
    return null;
  }

  return `CRON_TZ=${timezone} ${trimmedCron}`;
}
