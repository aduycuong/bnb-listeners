import type { AlertWindow } from "@/lib/projects/alert-templates";

const WINDOW_MS: Record<AlertWindow, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export function alertWindowRange(window: AlertWindow, now: Date) {
  const length = WINDOW_MS[window];
  return {
    end: now,
    start: new Date(now.getTime() - length),
    previousStart: new Date(now.getTime() - 2 * length),
  };
}

export function safeTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

/**
 * Bucket that suppresses a repeat while the condition stays true:
 * one hour, one calendar day in the project timezone, or one 7-day epoch block.
 * Viral posts use `once`.
 */
export function alertBucket(window: AlertWindow | null, now: Date, timeZone: string) {
  if (!window) return "once";
  if (window === "7d") return `w${Math.floor(now.getTime() / WINDOW_MS["7d"])}`;

  const zone = safeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: window === "1h" ? "2-digit" : undefined,
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  return window === "1h" ? `${day}T${part("hour")}` : day;
}
