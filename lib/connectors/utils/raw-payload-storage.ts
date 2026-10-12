import { getObjectFromR2 } from "@/lib/r2/services/get-object-from-r2";
import { putObjectToR2 } from "@/lib/r2/services/put-object-to-r2";

/**
 * L0 archive for raw connector payloads. Backed by R2 today; callers only see
 * keys, so `collect_runs.payload_key` does not depend on the storage.
 *
 * R2_BUCKET_NAME is public (media), so production should point
 * R2_RAW_BUCKET_NAME at a private bucket: payloads hold personal data.
 */
function getRawBucket(): string | undefined {
  return process.env.R2_RAW_BUCKET_NAME?.trim() || undefined;
}

export const rawPayloadStorage = {
  async put(key: string, body: string): Promise<void> {
    await putObjectToR2({
      key,
      body: Buffer.from(body, "utf8"),
      contentType: "application/json",
      bucket: getRawBucket(),
    });
  },

  async get(key: string): Promise<string> {
    const object = await getObjectFromR2({ key, bucket: getRawBucket() });
    return object.body.toString("utf8");
  },
};
