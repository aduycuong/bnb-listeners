import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";
import { cn } from "@/lib/utils";

import {
  formatCount,
  formatSignedPoints,
  MixBar,
  sentimentHeadline,
  sentimentSegments,
  sentimentTone,
  SENTIMENT_META,
} from "./listening-ui";

type ListeningSentimentCardProps = {
  demo: ListeningDemo;
};

export function ListeningSentimentCard({ demo }: ListeningSentimentCardProps) {
  const net = Math.round(demo.netSentiment.value);
  const tone = sentimentTone(demo.netSentiment.value);
  const segments = sentimentSegments(demo.sentiment);
  const total =
    demo.sentiment.negative + demo.sentiment.neutral + demo.sentiment.positive;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sắc thái</CardTitle>
        <CardDescription>{demo.comparisonLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p
            className={cn(
              "text-4xl font-semibold tabular-nums tracking-tight",
              tone === "negative" && SENTIMENT_META.negative.text,
              tone === "positive" && SENTIMENT_META.positive.text,
            )}
          >
            {net > 0 ? `+${net}` : net}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sentimentHeadline(demo.netSentiment.value)}
            <span className="mx-1.5">·</span>
            {formatSignedPoints(demo.netSentiment.deltaPoints)}
          </p>
        </div>

        <div className="space-y-3">
          <MixBar segments={segments} />
          {segments.map((segment) => {
            const percent = Math.round((segment.value / total) * 100);
            return (
              <div
                key={segment.label}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2 rounded-[2px]"
                    style={{ backgroundColor: segment.color }}
                  />
                  {segment.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {percent}%
                  <span className="ml-2 text-xs">{formatCount(segment.value)}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Cảm xúc trong bài</p>
          {demo.emotions.map((emotion) => (
            <div key={emotion.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span>{emotion.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(emotion.share * 100)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${emotion.share * 100}%`,
                    backgroundColor: emotion.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
