export function DashboardHome() {
  return (
    <div className="flex min-h-full flex-1 flex-col p-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Research document pipeline
        </h1>
        <p className="text-sm text-muted-foreground">
          Collect, score, classify, and serve content for real-estate and
          marketing research. Use the REST API or MCP tools with your workspace
          id to ingest documents.
        </p>
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">Pipeline</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Collect — ingest pages, blogs, news, and social posts</li>
            <li>Score — rate quality and filter noisy content</li>
            <li>Classify — assign topics or auto-create new ones</li>
            <li>Serve — vector and full-text retrieval for AI agents</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
