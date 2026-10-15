"use client";

import type { AquaCase } from "@/lib/projects/aqua-demo";

/** Dark navy of the demo becomes a theme color, readable on the dark theme too. */
const COLORS = ["#0A6CFF", "var(--tile-blue-foreground)", "#22C5EE", "#14B8A6", "#4A6583"];

export type KeywordCloudWord = {
  key: string;
  name: string;
  mentions: number;
  /** Share of negative mentions, in %. */
  negative: number;
};

/** Keyword cloud: font size by mentions, red when negative mentions are the majority. */
export function KeywordCloud({ words }: { words: KeywordCloudWord[] }) {
  const max = Math.max(...words.map((word) => word.mentions), 1);

  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-3.5 gap-y-1.5 px-1 py-2 leading-tight">
      {words.map((word, index) => (
        <span
          key={word.key}
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

/** Keyword cloud of the demo, from its topics and query terms. */
export function DemoKeywordCloud({ data }: { data: AquaCase }) {
  const max = Math.max(...data.topics.map((topic) => topic.mentions), 1);
  const words = [
    ...data.topics,
    ...data.query.with.map((name, index) => ({
      name,
      mentions: max * (0.18 + 0.05 * index),
      negative: 10,
    })),
  ].map((word, index) => ({ ...word, key: `${word.name}-${index}` }));

  return <KeywordCloud words={words} />;
}
