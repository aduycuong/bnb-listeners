import type { ResearchSource } from "../types";

/** Renders numbered citation sources for the MCP tool text response. */
export function formatSourcesText(sources: ResearchSource[]): string {
  return sources
    .map((source) => {
      const meta = [
        source.title,
        source.kind === "web" ? "web" : source.docType,
        source.publishedAt
          ? new Date(source.publishedAt).toLocaleDateString()
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `[${source.index}] ${meta} · ${source.ref}`;
    })
    .join("\n");
}
