import {
  ArrowDownIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BotIcon,
  GlobeIcon,
  SparklesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type InfographicNodeProps = {
  icon: LucideIcon;
  label: string;
  featured?: boolean;
  iconClassName?: string;
  className?: string;
};

function InfographicNode({
  icon: Icon,
  label,
  featured = false,
  iconClassName,
  className,
}: InfographicNodeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/5",
        featured && "px-6 py-5 shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted",
          featured && "size-12 rounded-2xl",
        )}
      >
        <Icon
          className={cn(
            "size-5 text-muted-foreground",
            featured && "size-6",
            iconClassName,
          )}
        />
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          featured && "text-base font-semibold",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function FlowArrow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-muted-foreground/60",
        className,
      )}
      aria-hidden="true"
    >
      <ArrowRightIcon className="hidden size-6 md:block" />
      <ArrowDownIcon className="size-6 md:hidden" />
    </div>
  );
}

export function DashboardHomeInfographic() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-10 md:px-8">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-5">
        <div className="flex w-full max-w-xs flex-col gap-3 md:w-auto md:max-w-none">
          <InfographicNode
            icon={SparklesIcon}
            label="Skills"
            iconClassName="text-violet-600 dark:text-violet-400"
          />
          <InfographicNode
            icon={WrenchIcon}
            label="Tools"
            iconClassName="text-sky-600 dark:text-sky-400"
          />
          <InfographicNode
            icon={BookOpenIcon}
            label="Knowledge base"
            iconClassName="text-amber-600 dark:text-amber-400"
          />
        </div>

        <FlowArrow />

        <InfographicNode
          icon={BotIcon}
          label="Agent"
          featured
          iconClassName="text-primary"
          className="w-full max-w-xs md:w-auto md:max-w-none"
        />

        <FlowArrow />

        <div className="flex w-full max-w-xs flex-col gap-3 md:w-auto md:max-w-none">
          <InfographicNode
            icon={GlobeIcon}
            label="Web"
            iconClassName="text-emerald-600 dark:text-emerald-400"
          />
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <FacebookIcon className="size-5 text-[#1877F2]" />
            </div>
            <span className="text-sm font-medium">Facebook</span>
          </div>
        </div>
      </div>
    </div>
  );
}
