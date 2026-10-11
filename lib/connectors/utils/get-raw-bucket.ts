/**
 * Bucket for raw payloads. R2_BUCKET_NAME is public (media), so production
 * should point R2_RAW_BUCKET_NAME at a private bucket.
 */
export function getRawBucket(): string | undefined {
  return process.env.R2_RAW_BUCKET_NAME?.trim() || undefined;
}
