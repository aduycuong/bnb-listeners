export type MediaAssetKind = "image" | "video";

export type ArchiveMediaUrlParams = {
  sourceUrl: string;
  kind: MediaAssetKind;
  /** Segments used to build a deterministic object key, e.g. [workspaceId, documentId, partIndex]. */
  keySegments: Array<string | number>;
};

export type ArchiveMediaUrlResult = {
  storageKey: string;
  storageUrl: string;
  contentType: string;
  bytes: number;
};

export type MediaArchiveErrorCode =
  | "MEDIA_DOWNLOAD_FAILED"
  | "MEDIA_DOWNLOAD_TIMEOUT"
  | "MEDIA_UNSUPPORTED_TYPE"
  | "MEDIA_TOO_LARGE"
  | "MEDIA_EMPTY"
  | "MEDIA_STORAGE_NOT_CONFIGURED";
