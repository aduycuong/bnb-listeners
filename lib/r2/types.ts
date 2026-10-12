export type PutObjectToR2Params = {
  key: string;
  body: Buffer;
  contentType: string;
  /** Defaults to R2_BUCKET_NAME. */
  bucket?: string;
};

export type PutObjectToR2Result = {
  key: string;
  publicUrl: string;
  contentType: string;
};

export type DeleteObjectsFromR2Params = {
  keys: string[];
};

export type DeleteObjectsFromR2Result = {
  deletedKeys: string[];
};

export type GetObjectFromR2Params = {
  key: string;
  /** Defaults to R2_BUCKET_NAME. */
  bucket?: string;
};

export type GetObjectFromR2Result = {
  key: string;
  body: Buffer;
  contentType: string | null;
};
