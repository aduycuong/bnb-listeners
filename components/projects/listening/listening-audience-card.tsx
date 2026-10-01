import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";

import {
  formatCompact,
  initials,
  MixBar,
  SENTIMENT_META,
  sentimentSegments,
} from "./listening-ui";

const SENTIMENT_KEYS = ["negative", "neutral", "positive"] as const;

type ListeningAudienceCardProps = {
  demo: ListeningDemo;
};

export function ListeningAudienceCard({ demo }: ListeningAudienceCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Ai đang nói</CardTitle>
        <CardDescription>
          Phần thảo luận của mỗi nhóm, và giọng kéo kỳ này
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {SENTIMENT_KEYS.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: SENTIMENT_META[key].color }}
              />
              {SENTIMENT_META[key].label}
            </span>
          ))}
        </div>
        <div className="space-y-3">
          {demo.audience.map((group) => (
            <div key={group.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{group.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(group.share * 100)}% thảo luận
                </span>
              </div>
              <MixBar
                segments={sentimentSegments({
                  negative: group.negative,
                  neutral: group.neutral,
                  positive: group.positive,
                })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t pt-4">
          {demo.voices.map((voice) => (
            <div key={voice.name} className="flex gap-3">
              <Avatar>
                <AvatarFallback>{initials(voice.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{voice.name}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatCompact(voice.reach)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{voice.role}</p>
                <p className="mt-1 text-sm leading-snug">“{voice.quote}”</p>
                <p
                  className={`mt-1 text-xs ${SENTIMENT_META[voice.sentiment].text}`}
                >
                  {SENTIMENT_META[voice.sentiment].label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
