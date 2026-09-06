/**
 * IANA timezone helpers for form selects.
 * - {@link getTimezoneIds} / {@link getTimezoneOptions}: full list (Intl), fallback to common ids.
 * - {@link getCommonTimezoneOptions}: curated list for cron / schedulers that only support common zones.
 */

export type TimezoneOption = {
  value: string;
  label: string;
};

/** Fallback when `Intl.supportedValuesOf("timeZone")` is unavailable; also used for cron-only UIs */
export const COMMON_TIMEZONE_IDS = [
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
  "UTC",
] as const;

function getOffsetLabel(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value ?? "";
  } catch {
    return "";
  }
}

function buildOptions(ids: readonly string[]): TimezoneOption[] {
  return [...ids]
    .map((value) => {
      const offset = getOffsetLabel(value);
      const label = offset ? `${value} (${offset})` : value;
      return { value, label };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * All IANA timezone ids when supported by the runtime; otherwise {@link COMMON_TIMEZONE_IDS}.
 */
export function getTimezoneIds(): string[] {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    try {
      return (Intl.supportedValuesOf as (key: string) => string[])("timeZone");
    } catch {
      // Fall through to common list
    }
  }
  return [...COMMON_TIMEZONE_IDS];
}

let cachedAllOptions: TimezoneOption[] | null = null;

/**
 * Full timezone options for select inputs (e.g. general profile / locale pickers).
 */
export function getTimezoneOptions(): TimezoneOption[] {
  if (cachedAllOptions) return cachedAllOptions;
  cachedAllOptions = buildOptions(getTimezoneIds());
  return cachedAllOptions;
}

let cachedCommonOptions: TimezoneOption[] | null = null;

/**
 * Curated timezone options for cron / schedule fields that only support common ids.
 */
export function getCommonTimezoneOptions(): TimezoneOption[] {
  if (cachedCommonOptions) return cachedCommonOptions;
  cachedCommonOptions = buildOptions(COMMON_TIMEZONE_IDS);
  return cachedCommonOptions;
}
