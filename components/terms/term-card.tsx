"use client";

import {
  CheckSquareIcon,
  EllipsisIcon,
  PencilIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { TermSparkline } from "@/components/terms/term-sparkline";
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
import { TERM_CREATED_BY } from "@/lib/terms/term-config";
import type { TermCardGroup, TermCardItem } from "@/lib/terms/types";
import { cn } from "@/lib/utils";

type TermCardProps = {
  term: TermCardItem;
  href?: string;
  getGroupHref?: (groupId: string) => string;
  canEdit?: boolean;
  selected?: boolean;
  onEdit?: (termId: string) => void;
  onSelect?: (termId: string) => void;
  onDelete?: (termId: string) => void;
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

function TermGroupBadge({
  group,
  href,
}: {
  group: TermCardGroup;
  href?: string;
}) {
  const className = cn(
    "inline-flex max-w-full rounded-full px-2 py-0.5 text-[11px] font-medium",
    "bg-primary/10 text-primary",
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(className, "truncate hover:bg-primary/15")}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {group.name}
      </a>
    );
  }

  return (
    <span className={cn(className, "truncate")} title={group.name}>
      {group.name}
    </span>
  );
}

export function TermCard({
  term,
  href,
  getGroupHref,
  canEdit = false,
  selected = false,
  onEdit,
  onSelect,
  onDelete,
}: TermCardProps) {
  const router = useRouter();
  const isUpdating = term.digest.isStale;
  const showClassifierBadge = term.createdBy === TERM_CREATED_BY.llmClassifier;
  const hasBadges = showClassifierBadge || term.groups.length > 0;

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
          <span className="line-clamp-2">{term.name}</span>
        </CardTitle>
        {hasBadges ? (
          <div className="flex flex-wrap gap-1.5">
            {showClassifierBadge ? (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Classifier
              </span>
            ) : null}
            {term.groups.map((group) => (
              <TermGroupBadge
                key={group.id}
                group={group}
                href={getGroupHref?.(group.id)}
              />
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
                    aria-label={`Actions for ${term.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem onClick={() => onEdit?.(term.id)}>
                  <PencilIcon />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSelect?.(term.id)}>
                  {selected ? <SquareIcon /> : <CheckSquareIcon />}
                  {selected ? "Deselect" : "Select"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(term.id)}
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
              {term.digest.docCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Docs</p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {formatScore(term.digest.avgQualityScore)}
            </p>
            <p className="text-[11px] text-muted-foreground">Quality</p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {formatScore(term.digest.trendScore)}
            </p>
            <p className="text-[11px] text-muted-foreground">Trend</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Last 7 days</span>
            <span>Created {formatListDate(term.createdAt)}</span>
          </div>
          <TermSparkline points={term.sparkline} />
        </div>
      </CardContent>
    </Card>
  );
}
