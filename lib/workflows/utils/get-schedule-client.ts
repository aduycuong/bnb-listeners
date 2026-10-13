import { Client } from "@upstash/qstash";

let client: Client | null = null;

/**
 * QStash client for workflow schedules. Like the workflow client, it follows
 * `QSTASH_URL` so schedules land on the local QStash dev server when set.
 */
export function getScheduleClient(): Client {
  if (!client) {
    const token = process.env.QSTASH_TOKEN;

    if (!token) {
      throw new Error("QSTASH_TOKEN environment variable is not set");
    }

    client = new Client({
      token,
      baseUrl: process.env.QSTASH_URL?.trim() || undefined,
    });
  }

  return client;
}
