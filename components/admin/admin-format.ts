const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

const numberFormat = new Intl.NumberFormat("vi-VN");

/** Date and time in Vietnam time; "—" when missing. */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormat.format(new Date(value)) : "—";
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : numberFormat.format(value);
}

/** "in 2h 5m" / "3h 10m ago" relative to now. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";

  const diffMs = new Date(value).getTime() - Date.now();
  const minutes = Math.round(Math.abs(diffMs) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;

  const span =
    days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
  return diffMs >= 0 ? `in ${span}` : `${span} ago`;
}

/** Duration between two timestamps; "running" when not finished. */
export function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  if (!end) return "running";

  const seconds = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const smallUsdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

/** "$12.34"; amounts under a dollar keep up to 4 decimals so cheap runs do not show as $0.00. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Math.abs(value) > 0 && Math.abs(value) < 1 ? smallUsdFormat.format(value) : usdFormat.format(value);
}
