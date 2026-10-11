import { Client } from "@upstash/workflow";

let client: Client | null = null;

/**
 * Workflow client for triggering runs and notifying waiting steps.
 * `QSTASH_URL` points it at the local QStash dev server when set.
 */
export function getWorkflowClient(): Client {
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
