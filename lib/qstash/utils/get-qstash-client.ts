import { Client } from "@upstash/qstash";

let client: Client | null = null;

export function getQstashClient(): Client {
  if (!client) {
    const token = process.env.QSTASH_TOKEN;

    if (!token) {
      throw new Error("QSTASH_TOKEN environment variable is not set");
    }

    client = new Client({ token });
  }

  return client;
}

