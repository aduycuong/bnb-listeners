"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";

import { TopicSparkline } from "@/components/topics/topic-sparkline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOPIC_CREATED_BY } from "@/lib/topics/topic-config";
import type { TopicCardItem } from "@/lib/topics/types";
import { cn } from "@/lib/utils";

type TopicCardProps = {
  topic: TopicCardItem;
  canEdit?: boolean;
  onEdit?: (topicId: string) => void;
  onDelete?: (topicId: string) => void;
};

function formatListDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatScore(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toFixed(1);
}

function getVerifiedBadge(verified: boolean) {
  return verified
    ? {
        label: "Verified",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      }
    : {
        label: "Unverified",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
}

export function TopicCard({
  topic,
  canEdit = false,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const verifiedBadge = getVerifiedBadge(topic.verified);
  const badges = [
    verifiedBadge,
    ...(topic.createdBy === TOPIC_CREATED_BY.llmClassifier
      ? [
          {
            label: "Classifier",
            className: "bg-muted text-muted-foreground",
          },
        ]
      : []),
    ...(topic.digest.isStale
      ? [
          {
            label: "Updating",
            className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
          },
        ]
      : []),
  ];

  return (
    <Card className="h-full w-full max-w-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <CardHeader className="gap-2">
        <CardTitle className="line-clamp-2 pr-2">{topic.name}</CardTitle>
        {topic.parentName ? (
          <CardDescription className="truncate">
            Parent: {topic.parentName}
          </CardDescription>
        ) : null}
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        {canEdit ? (
          <CardAction>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${topic.name}`}
                onClick={() => onEdit?.(topic.id)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${topic.name}`}
                onClick={() => onDelete?.(topic.id)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {topic.digest.docCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Docs</p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {formatScore(topic.digest.avgQualityScore)}
            </p>
            <p className="text-[11px] text-muted-foreground">Quality</p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {formatScore(topic.digest.trendScore)}
            </p>
            <p className="text-[11px] text-muted-foreground">Trend</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Last 7 days</span>
            <span>Created {formatListDate(topic.createdAt)}</span>
          </div>
          <TopicSparkline points={topic.sparkline} />
        </div>
      </CardContent>
    </Card>
  );
}
