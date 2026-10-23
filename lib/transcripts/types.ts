/** A name the speech recognizer may have misheard, with its other spellings. */
export type TranscriptGlossaryTerm = {
  name: string;
  aliases: string[];
};

export type TranscriptReplacement = {
  from: string;
  to: string;
};

export type DroppedTranscriptReplacement = TranscriptReplacement & {
  reason: "not in transcript" | "not a glossary name" | "not alike";
};

export type CorrectItemTranscriptsResult = {
  /** At least one name replaced. */
  corrected: number;
  /** Checked, nothing to replace. */
  unchanged: number;
  /** Already corrected with the same glossary. */
  current: number;
  /** No project follows the source, so there are no names to correct against. */
  noGlossary: number;
  failed: number;
};

export type CorrectTranscriptResult = {
  /** The transcript with the accepted replacements; the original when there are none. */
  text: string;
  applied: TranscriptReplacement[];
  dropped: DroppedTranscriptReplacement[];
};
