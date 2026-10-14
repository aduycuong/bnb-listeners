"use client";

import { SENTIMENT_LABELS, SENTIMENTS, type Sentiment } from "@/lib/enrichment/config";
import { cn } from "@/lib/utils";

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "border-emerald-500/60 bg-emerald-500/15",
  neutral: "border-slate-400/60 bg-slate-400/15",
  negative: "border-rose-500/60 bg-rose-500/15",
};

/** Sentiment buttons and aspect chips for labeling one mention. */
export function SentimentAspectPicker({
  aspects,
  sentiment,
  aspectKeys,
  disabled,
  onSentiment,
  onAspects,
  shortcuts,
}: {
  aspects: { key: string; name: string }[];
  sentiment: string | null;
  aspectKeys: string[] | null;
  disabled?: boolean;
  onSentiment: (value: Sentiment) => void;
  onAspects: (keys: string[]) => void;
  /** Show 1/2/3 next to the sentiment buttons. */
  shortcuts?: boolean;
}) {
  const selected = new Set(aspectKeys ?? []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Cảm xúc</span>
        {SENTIMENTS.map((value, index) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={sentiment === value}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs disabled:opacity-50",
              sentiment === value ? SENTIMENT_STYLES[value] : "border-border",
            )}
            onClick={() => onSentiment(value)}
          >
            {SENTIMENT_LABELS[value]}
            {shortcuts ? <span className="ml-1 text-muted-foreground">{index + 1}</span> : null}
          </button>
        ))}
      </div>
      {aspects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Khía cạnh</span>
          {aspects.map((aspect) => {
            const on = selected.has(aspect.key);
            return (
              <button
                key={aspect.key}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs disabled:opacity-50",
                  on ? "border-primary bg-primary/15" : "border-border",
                )}
                onClick={() =>
                  onAspects(on ? [...selected].filter((key) => key !== aspect.key) : [...selected, aspect.key])
                }
              >
                {aspect.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
