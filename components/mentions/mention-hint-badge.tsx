"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** A classification chip whose hover text says what the chip means. */
export function MentionHintBadge({
  tooltip,
  children,
  variant = "outline",
}: {
  tooltip: string;
  children: ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex max-w-full">
            <Badge variant={variant} className="h-auto max-w-72 cursor-help whitespace-normal text-left">
              {children}
            </Badge>
          </span>
        }
      />
      <TooltipContent className="max-w-xs text-left">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
