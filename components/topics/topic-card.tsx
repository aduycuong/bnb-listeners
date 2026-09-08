"use client";

import {
  CheckSquareIcon,
  EllipsisIcon,
  PencilIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { TopicSparkline } from "@/components/topics/topic-sparkline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOPIC_CREATED_BY } from "@/lib/topics/topic-config";
import type { TopicCardItem } from "@/lib/topics/types";
import { cn } from "@/lib/utils";

type TopicCardProps = {
  topic: TopicCardItem;
  href?: string;
  canEdit?: boolean;
  selected?: boolean;
  onEdit?: (topicId: string) => void;
  onSelect?: (topicId: string) => void;
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

export function TopicCard({
  topic,
  href,
  canEdit = false,
  selected = false,
  onEdit,
  onSelect,
  onDelete,
}: TopicCardProps) {
  const router = useRouter();
  const isUpdating = topic.digest.isStale;
  const badges = [
    ...(topic.createdBy === TOPIC_CREATED_BY.llmClassifier
      ? [
          {
            label: "Classifier",
            className: "bg-muted text-muted-foreground",
          },
        ]
      : []),
  ];

  return (
    <Card
      aria-selected={selected}
      className={cn(
        "h-full w-full max-w-sm transition duration-200",
        href ? "cursor-pointer" : null,
        selected
          ? "bg-primary/5 ring-2 ring-primary"
          : "hover:-translate-y-0.5 hover:shadow-sm",
      )}
      onClick={
        href
          ? () => {
              router.push(href);
            }
          : undefined
      }
    >
      <CardHeader className="gap-2">
        <CardTitle className="flex items-start gap-2 pr-2">
          {isUpdating ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center"
                    aria-label="Updating"
                  >
                    <span className="absolute size-2 animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative size-2 rounded-full bg-sky-500" />
                  </span>
                }
              />
              <TooltipContent>Updating</TooltipContent>
            </Tooltip>
          ) : null}
          <span className="line-clamp-2">{topic.name}</span>
        </CardTitle>
        {badges.length > 0 ? (
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
        ) : null}
        {canEdit ? (
          <CardAction
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Actions for ${topic.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem onClick={() => onEdit?.(topic.id)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSelect?.(topic.id)}>
                  {selected ? <SquareIcon /> : <CheckSquareIcon />}
                  {selected ? "Deselect" : "Select"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(topic.id)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
