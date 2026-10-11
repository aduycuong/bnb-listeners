import { GetObjectCommand } from "@aws-sdk/client-s3";

import { APIError } from "@/lib/exposers/api-error";

import type { GetObjectFromR2Params, GetObjectFromR2Result } from "../types";
import { getR2S3Client, isR2Configured } from "../utils/get-r2-s3-client";
import { normalizeObjectKey } from "../utils/normalize-object-key";

export async function getObjectFromR2(
  params: GetObjectFromR2Params,
): Promise<GetObjectFromR2Result> {
  if (!isR2Configured()) {
    throw new APIError("ERR_R2_NOT_CONFIGURED", "R2 is not configured", 503);
  }

  const objectKey = normalizeObjectKey(params.key);
  if (!objectKey) {
    throw new APIError(
      "ERR_R2_INVALID_KEY",
      `Invalid R2 object key: "${params.key}"`,
      400,
    );
  }

  const client = getR2S3Client();
  const bucket = params.bucket ?? process.env.R2_BUCKET_NAME;

  if (!client || !bucket) {
    throw new APIError("ERR_R2_NOT_CONFIGURED", "R2 is not configured", 503);
  }

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
  );

  if (!response.Body) {
    throw new APIError(
      "ERR_R2_EMPTY_OBJECT",
      `R2 object has no body: "${objectKey}"`,
      502,
    );
  }

  const bytes = await response.Body.transformToByteArray();

  return {
    key: objectKey,
    body: Buffer.from(bytes),
    contentType: response.ContentType ?? null,
  };
}
