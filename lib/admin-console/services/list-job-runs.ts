import type { Log } from "@upstash/qstash";

import { ServiceError } from "@/lib/common/service-errors";
import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { getQstashClient } from "@/lib/qstash/utils/get-qstash-client";

import type { AdminJobRun, ListJobRunsParams, ListJobRunsResult } from "../types";

/** Log events per page; a message has 3+ events (created, active, delivered…). */
const EVENTS_PER_PAGE = 300;

const FAILED_ATTEMPT_STATES = new Set(["ERROR", "RETRY"]);

function decodeBody(body: string | undefined): Record<string, unknown> | null {
  if (!body) return null;
  for (const text of [body, Buffer.from(body, "base64").toString("utf8")]) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Not this encoding.
    }
  }
  return null;
}

function readHeader(log: Log, name: string): string | null {
  const entry = Object.entries(log.header ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  const value: unknown = entry?.[1];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
}

/** Events of one message, newest first, folded into one run. */
function toJobRun(events: Log[]): AdminJobRun {
  const newest = events[0]!;
  const oldest = events.at(-1)!;
  const body = events.map((event) => decodeBody(event.body)).find(Boolean) ?? null;
  const jobName = typeof body?.jobName === "string" ? body.jobName : null;

  return {
    messageId: newest.messageId,
    jobName,
    scheduleId:
      events.map((event) => readHeader(event, "Upstash-Schedule-Id")).find(Boolean) ?? null,
    state: newest.state,
    createdAt: new Date(oldest.time).toISOString(),
    updatedAt: new Date(newest.time).toISOString(),
    failedAttempts: events.filter((event) => FAILED_ATTEMPT_STATES.has(event.state)).length,
    error: events.find((event) => event.error)?.error ?? null,
    nextDeliveryAt: newest.nextDeliveryTime ? new Date(newest.nextDeliveryTime).toISOString() : null,
    events: events.map((event) => ({
      state: event.state,
      time: new Date(event.time).toISOString(),
      error: event.error ?? null,
    })),
  };
}

/**
 * Recent QStash job messages (`/api/qstash/callback` of this server: scheduled
 * alerts and reports, queued report generation), newest first. QStash logs one
 * event per state change, so events are grouped by message; a message whose
 * events straddle a page shows up on both pages with the events of each.
 */
export async function listJobRuns(params: ListJobRunsParams): Promise<ListJobRunsResult> {
  const { logs, cursor } = await getQstashClient()
    .logs({
      cursor: params.cursor,
      count: EVENTS_PER_PAGE,
      filter: { url: getCallbackUrl(), state: params.state },
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceError("UNKNOWN", `QStash logs unavailable: ${message}`);
    });

  const byMessage = new Map<string, Log[]>();
  for (const log of [...logs].sort((a, b) => b.time - a.time)) {
    const events = byMessage.get(log.messageId) ?? [];
    events.push(log);
    byMessage.set(log.messageId, events);
  }

  return {
    runs: [...byMessage.values()].map(toJobRun),
    cursor: cursor ? String(cursor) : null,
  };
}
