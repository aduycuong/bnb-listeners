import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";

import { formatCompact, SENTIMENT_META } from "./listening-ui";

type ListeningMentionsCardProps = {
  demo: ListeningDemo;
};

export function ListeningMentionsCard({ demo }: ListeningMentionsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Thảo luận nổi bật</CardTitle>
        <CardDescription>
          Những bài đại diện cho kỳ này, không phải danh sách đầy đủ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {demo.highlights.map((mention) => {
          const sentiment = SENTIMENT_META[mention.sentiment];

          return (
            <article
              key={`${mention.author}-${mention.publishedLabel}`}
              className="border-b pb-5 last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {mention.source}
                  <span className="mx-1.5">·</span>
                  {mention.author}
                  <span className="mx-1.5">·</span>
                  {mention.publishedLabel}
                </p>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${sentiment.badge}`}
                >
                  {sentiment.label}
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-medium">{mention.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {mention.excerpt}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{mention.topics.join(" · ")}</span>
                <span className="ml-auto tabular-nums text-foreground">
                  {formatCompact(mention.engagement)} tương tác
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  phủ {formatCompact(mention.reach)}
                </span>
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
