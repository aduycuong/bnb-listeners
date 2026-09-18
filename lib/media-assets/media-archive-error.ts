import type { MediaArchiveErrorCode } from "./types";

/**
 * Thrown by archiveMediaUrl. Carries a stable code so scoring can persist a
 * short reason on the part without leaking stack traces.
 */
export class MediaArchiveError extends Error {
  constructor(
    public readonly code: MediaArchiveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MediaArchiveError";
  }
}
