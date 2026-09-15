export type DocumentTermFilterMode = "all" | "none" | "selected";

export const DOCUMENT_TERM_FILTER_MODES = [
  "all",
  "none",
  "selected",
] as const satisfies readonly DocumentTermFilterMode[];

export const DOCUMENT_TERM_FILTER_LABELS: Record<
  DocumentTermFilterMode,
  string
> = {
  all: "All documents",
  none: "Unassigned",
  selected: "Specific terms",
};
