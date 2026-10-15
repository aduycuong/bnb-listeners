"use client";

import type { AquaCase } from "@/lib/projects/aqua-demo";

const COLORS = ["#0A6CFF", "#0B2D72", "#22C5EE", "#14B8A6", "#4A6583"];

/** Keyword cloud of the demo: font size by mentions, red when negative mentions are the majority. */
export function DemoKeywordCloud({ data }: { data: AquaCase }) {
  const max = Math.max(...data.topics.map((topic) => topic.mentions), 1);
  const words = [
    ...data.topics,
    ...data.query.with.map((name, index) => ({
      name,
      mentions: max * (0.18 + 0.05 * index),
      negative: 10,
    })),
  ];

  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-3.5 gap-y-1.5 px-1 py-2 leading-tight">
      {words.map((word, index) => (
        <span
          key={`${word.name}-${index}`}
          className="font-semibold"
          style={{
            fontSize: 13 + Math.round((word.mentions / max) * 22),
            color: word.negative >= 50 ? "var(--neg)" : COLORS[index % COLORS.length],
          }}
        >
          {word.name}
        </span>
      ))}
    </div>
  );
}
