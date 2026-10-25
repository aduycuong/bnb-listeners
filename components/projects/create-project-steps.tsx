"use client";

import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CreateProjectStep = {
  label: string;
  hint: string;
};

type StepsProps = {
  steps: readonly CreateProjectStep[];
  current: number;
  onSelect: (index: number) => void;
};

/** Vertical step list of the create wizard; only finished steps are clickable. */
export function CreateProjectStepNav({ steps, current, onSelect }: StepsProps) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const last = index === steps.length - 1;
        return (
          <li key={step.label} className="relative">
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 -bottom-2 left-[22px] w-px",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            ) : null}
            <button
              type="button"
              disabled={!done}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                active && "bg-primary/8",
                done && "hover:bg-muted",
                !done && "cursor-default",
              )}
              onClick={() => onSelect(index)}
            >
              <span
                className={cn(
                  "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary/40 bg-background text-primary",
                  !active && !done && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={cn(
                    "block text-[13px] leading-tight font-medium",
                    !active && !done && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                  {step.hint}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact progress for screens without the step column. */
export function CreateProjectStepProgress({
  steps,
  current,
}: Omit<StepsProps, "onSelect">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-medium">{steps[current]?.label}</span>
        <span className="text-xs text-muted-foreground">
          Bước {current + 1}/{steps.length}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Chosen case under the step list, with a shortcut back to step 1. */
export function CreateProjectCaseCard({
  icon,
  label,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-lg leading-none">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted-foreground">Kiểu case</span>
        <span className="block truncate text-[13px] font-medium">{label}</span>
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onChange}>
        Đổi
      </Button>
    </div>
  );
}
