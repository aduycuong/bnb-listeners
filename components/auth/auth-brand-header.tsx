export function AuthBrandHeader() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-2xl font-bold text-background">
        B
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">BNB Chat Agent</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Build and run AI chat agents for your workspaces.
      </p>
    </div>
  );
}
