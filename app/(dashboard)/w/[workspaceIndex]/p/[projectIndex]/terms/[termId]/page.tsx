import { TermDetailRoutePage } from "@/components/terms/term-route-pages";

type PageProps = {
  params: Promise<{
    workspaceIndex: string;
    projectIndex: string;
    termId: string;
  }>;
};

export default async function TermDetailRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex, termId } = await params;

  return (
    <TermDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
      termId={termId}
    />
  );
}
