export type PutObjectToR2Params = {
  key: string;
  body: Buffer;
  contentType: string;
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
