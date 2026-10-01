import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";

import {
  formatCount,
  formatSignedPercent,
  MixBar,
  SENTIMENT_META,
  sentimentSegments,
} from "./listening-ui";

type ListeningTopicsCardProps = {
  demo: ListeningDemo;
};

export function ListeningTopicsCard({ demo }: ListeningTopicsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Chủ đề</CardTitle>
        <CardDescription>
          Khối lượng, hướng sắc thái, và mức thay đổi {demo.comparisonLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(["negative", "neutral", "positive"] as const).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: SENTIMENT_META[key].color }}
              />
              {SENTIMENT_META[key].label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] gap-3 text-xs text-muted-foreground">
          <span>Chủ đề</span>
          <span className="text-right">Thay đổi</span>
          <span className="text-right">Bài</span>
        </div>
        <div className="space-y-3">
          {demo.topics.map((topic) => (
            <div
              key={topic.name}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_3.5rem] items-center gap-3"
            >
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-sm font-medium">{topic.name}</p>
                <MixBar
                  segments={sentimentSegments({
                    negative: topic.negative,
                    neutral: topic.neutral,
                    positive: topic.positive,
                  })}
                />
              </div>
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {formatSignedPercent(topic.deltaPercent)}
              </p>
              <p className="text-right text-sm tabular-nums">
                {formatCount(topic.mentions)}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Cụm đang lan</p>
          {demo.phrases.map((phrase) => (
            <div
              key={phrase.text}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">“{phrase.text}”</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatSignedPercent(phrase.deltaPercent)}
                <span className="ml-3 text-foreground">
                  {formatCount(phrase.mentions)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
