"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { HighlightTerms } from "./highlight-terms";

const PREVIEW_CHARS = 280;

/** Mention text, clamped until the reader asks for the full content. */
export function MentionExpandableText({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const value = text || "(không có chữ)";
  const canExpand = value.length > PREVIEW_CHARS || value.split("\n").length > 4;

  return (
    <div className="min-w-0">
      <p className={expanded || !canExpand ? "whitespace-pre-line" : "line-clamp-4 whitespace-pre-line"}>
        <HighlightTerms text={value} terms={terms} />
      </p>
      {canExpand ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="mt-1 px-0"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Thu gọn" : "Xem đầy đủ"}
        </Button>
      ) : null}
    </div>
  );
}
