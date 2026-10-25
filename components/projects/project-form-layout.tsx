import { cn } from "@/lib/utils";

/** Side navigation, form, and the live summary on very wide screens. */
export const PROJECT_FORM_COLUMNS =
  "lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)_280px]";

/** Page shell of the project create and settings forms; fills the dashboard scroll area. */
export function ProjectFormPage({
  ref,
  title,
  description,
  actions,
  children,
}: {
  ref?: React.Ref<HTMLDivElement>;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={ref}
      className="mx-auto flex min-h-full w-full max-w-screen-2xl scroll-mt-16 flex-col px-4 pt-5 md:px-7"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold">{title}</h1>
          {description ? (
            <div className="text-[13px] text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** Bar pinned to the bottom of the scroll area; its content lines up with the form column. */
export function ProjectFormActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-7 md:px-7">
      <div className={cn("grid gap-6", PROJECT_FORM_COLUMNS)}>
        <div className="flex items-center justify-between gap-3 lg:col-start-2">{children}</div>
      </div>
    </div>
  );
}
