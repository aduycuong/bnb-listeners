"use client";

import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Yes / no / clear for one item; `label` is the current answer, null when unlabeled. */
export function MentionLabelButtons({
  label,
  disabled,
  onChange,
  compact,
}: {
  label: boolean | null;
  disabled?: boolean;
  onChange: (value: boolean | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size={compact ? "xs" : "sm"}
        variant={label === true ? "default" : "outline"}
        disabled={disabled}
        aria-pressed={label === true}
        onClick={() => onChange(true)}
      >
        <CheckIcon />
        Có liên quan
      </Button>
      <Button
        type="button"
        size={compact ? "xs" : "sm"}
        variant={label === false ? "destructive" : "outline"}
        disabled={disabled}
        aria-pressed={label === false}
        onClick={() => onChange(false)}
      >
        <XIcon />
        Không liên quan
      </Button>
      {label !== null ? (
        <Button
          type="button"
          size={compact ? "icon-xs" : "icon"}
          variant="ghost"
          disabled={disabled}
          aria-label="Bỏ nhãn, dùng kết quả tự động"
          className={cn(compact && "size-6")}
          onClick={() => onChange(null)}
        >
          <RotateCcwIcon />
        </Button>
      ) : null}
    </div>
  );
}
