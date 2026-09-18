import { PutObjectCommand } from "@aws-sdk/client-s3";

import { APIError } from "@/lib/exposers/api-error";

import type { PutObjectToR2Params, PutObjectToR2Result } from "../types";
import { getR2S3Client, isR2Configured } from "../utils/get-r2-s3-client";
import { normalizeContentType } from "../utils/normalize-content-type";
import { normalizeObjectKey } from "../utils/normalize-object-key";

export async function putObjectToR2(
  params: PutObjectToR2Params,
): Promise<PutObjectToR2Result> {
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
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;

  if (!client || !bucket || !publicUrlBase) {
    throw new APIError("ERR_R2_NOT_CONFIGURED", "R2 is not configured", 503);
  }

  const contentType = normalizeContentType(params.contentType);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: params.body,
      ContentType: contentType,
    }),
  );

  const publicUrl = `${publicUrlBase.replace(/\/$/, "")}/${objectKey}`;

  return { key: objectKey, publicUrl, contentType };
}
