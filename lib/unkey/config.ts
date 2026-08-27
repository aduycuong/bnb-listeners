import { Unkey } from "@unkey/api";

export function createUnkeyClient(): Unkey {
  const rootKey = process.env.UNKEY_ROOT_KEY;
  if (!rootKey) {
    throw new Error("UNKEY_ROOT_KEY is not configured.");
  }
  return new Unkey({ rootKey });
}

export function getUnkeyApiId(): string {
  const apiId = process.env.UNKEY_API_ID;
  if (!apiId) {
    throw new Error("UNKEY_API_ID is not configured.");
  }
  return apiId;
}

export function isUnkeyConfigured(): boolean {
  return Boolean(process.env.UNKEY_ROOT_KEY?.trim()) && Boolean(process.env.UNKEY_API_ID?.trim());
}
