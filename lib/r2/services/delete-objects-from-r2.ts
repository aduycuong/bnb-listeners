import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

import { APIError } from "@/lib/exposers/api-error";

import type {
  DeleteObjectsFromR2Params,
  DeleteObjectsFromR2Result,
} from "../types";
import { getR2S3Client, isR2Configured } from "../utils/get-r2-s3-client";
import { normalizeObjectKey } from "../utils/normalize-object-key";

/**
 * Best-effort bulk delete. A no-op when R2 is not configured so cleanup paths
 * (document delete, part rebuild) never fail on environments without R2.
 */
export async function deleteObjectsFromR2(
  params: DeleteObjectsFromR2Params,
): Promise<DeleteObjectsFromR2Result> {
  if (!isR2Configured()) {
    return { deletedKeys: [] };
  }

  const uniqueKeys = [
    ...new Set(
      params.keys
        .map(normalizeObjectKey)
        .filter((key): key is string => key !== null),
    ),
  ];

  if (uniqueKeys.length === 0) {
    return { deletedKeys: [] };
  }

  const client = getR2S3Client();
  const bucket = process.env.R2_BUCKET_NAME;

  if (!client || !bucket) {
    throw new APIError("ERR_R2_NOT_CONFIGURED", "R2 is not configured", 503);
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: uniqueKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );

  return { deletedKeys: uniqueKeys };
}
