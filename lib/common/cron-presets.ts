import cronstrue from "cronstrue";

/**
 * Cron preset options and helpers for recurring schedule form field.
 * Cron format: minute hour day-of-month month day-of-week (standard 5-field).
 */

export const PRESET_BUTTON_OPTIONS = [
  { value: "daily-9", label: "Daily 9:00" },
  { value: "weekly-mon-9", label: "Weekly Mon 9:00" },
  { value: "monthly-1-9", label: "Monthly 1st 9:00" },
] as const;

export type PresetValue = (typeof PRESET_BUTTON_OPTIONS)[number]["value"];

export type CronScheduleFormValue = {
  cron: string;
  timezone: string;
};

export const EMPTY_CRON_SCHEDULE: CronScheduleFormValue = {
  cron: "",
  timezone: "UTC",
};

const PRESET_PATTERNS: Record<PresetValue, string> = {
  "daily-9": "0 9 * * *",
  "weekly-mon-9": "0 9 * * 1",
  "monthly-1-9": "0 9 1 * *",
};

function normalizeTimezone(raw: string | undefined | null): string {
  const s = raw?.trim();
  return s && s.length > 0 ? s : EMPTY_CRON_SCHEDULE.timezone;
}

/**
 * Coerce stored or legacy form values into `{ cron, timezone }`.
 */
export function normalizeCronScheduleValue(raw: unknown): CronScheduleFormValue {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const cron = typeof o.cron === "string" ? o.cron : "";
    const timezone = normalizeTimezone(
      typeof o.timezone === "string" ? o.timezone : undefined
    );
    return { cron, timezone };
  }
  if (typeof raw === "string") {
    return { cron: raw, timezone: EMPTY_CRON_SCHEDULE.timezone };
  }
  return { ...EMPTY_CRON_SCHEDULE };
}

/**
 * Returns cron + timezone for a preset. Preserves the current timezone;
 * unknown presets keep the current cron or fall back to a default pattern.
 */
export function getPresetCronSchedule(
  presetValue: string,
  current?: CronScheduleFormValue | null
): CronScheduleFormValue {
  const tz = normalizeTimezone(current?.timezone);
  const pattern = PRESET_PATTERNS[presetValue as PresetValue];
  if (pattern) {
    return { cron: pattern, timezone: tz };
  }
  const fallbackCron =
    (current?.cron?.trim() && current.cron) || "0 9 * * *";
  return { cron: fallbackCron, timezone: tz };
}

/**
 * Returns a human-friendly description of a cron pattern.
 */
export function getCronFriendlyText(cronPattern: string): string {
  const s = cronPattern.trim();
  if (!s) return "";

  try {
    return cronstrue.toString(s, {
      use24HourTimeFormat: true,
      throwExceptionOnParseError: true,
    });
  } catch {
    return s;
  }
}
