type SettingsPageLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsPageLayout({
  title,
  description,
  children,
}: SettingsPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
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
