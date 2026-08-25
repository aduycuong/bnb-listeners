import { QstashError } from "@upstash/qstash";

export function isScheduleNotFoundError(error: unknown): boolean {
  if (error instanceof QstashError && error.status === 404) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes("not found") || message.includes("404");
}
