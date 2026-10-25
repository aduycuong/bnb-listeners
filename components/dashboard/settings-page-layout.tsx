import { cn } from "@/lib/utils";

type SettingsPageLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** `wide` for pages with several cards side by side; `narrow` for a single column. */
  width?: "narrow" | "wide";
};

export function SettingsPageLayout({
  title,
  description,
  children,
  width = "narrow",
}: SettingsPageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-8 md:px-8",
        width === "wide" ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
