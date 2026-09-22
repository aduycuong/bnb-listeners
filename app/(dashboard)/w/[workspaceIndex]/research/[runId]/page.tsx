import { ResearchDetailRoutePage } from "@/components/research/research-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; runId: string }>;
};

export default async function ResearchRunPage({ params }: PageProps) {
  const { workspaceIndex, runId } = await params;

  return (
    <ResearchDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      runId={runId}
    />
  );
}
