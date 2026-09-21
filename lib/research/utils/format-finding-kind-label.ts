import type { FindingKind } from "../types";

/**
 * Short label shown in citation metadata: internal findings surface their
 * document type, other kinds surface the kind itself.
 */
export function formatFindingKindLabel(
  kind: FindingKind,
  docType?: string,
): string | undefined {
  switch (kind) {
    case "internal":
      return docType;
    case "web":
      return "web";
    case "analytics":
      return "analytics";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
