import { TermDetailRoutePage } from "@/components/terms/term-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; termId: string }>;
};

export default async function TermDetailPageRoute({ params }: PageProps) {
  const { workspaceIndex, termId } = await params;

  return (
    <TermDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      termId={termId}
    />
  );
}
