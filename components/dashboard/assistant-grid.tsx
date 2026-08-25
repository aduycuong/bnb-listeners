import { Card, CardContent } from "@/components/ui/card";
import { PLACEHOLDER_ASSISTANTS } from "@/lib/dashboard/placeholder-data";
import { cn } from "@/lib/utils";

export function AssistantGrid() {
  return (
    <section className="mt-10">
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Select an assistant to start a task
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_ASSISTANTS.map((assistant) => (
          <button
            key={assistant.id}
            type="button"
            className="text-left transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Card className="h-full border-border bg-card shadow-sm ring-1 ring-foreground/5">
              <CardContent className="flex flex-col gap-3 pt-0">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
                      assistant.avatarColor,
                    )}
                  >
                    {assistant.initials}
                  </div>
                  <div>
                    <p className="font-medium">{assistant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {assistant.role}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {assistant.description}
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
        <button
          type="button"
          className="flex min-h-[132px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-sm text-muted-foreground transition hover:border-foreground/20 hover:bg-card"
        >
          +10 more
        </button>
      </div>
    </section>
  );
}
