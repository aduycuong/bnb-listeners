import { TermGroupDetailRoutePage } from "@/components/term-groups/term-group-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; termGroupId: string }>;
};

export default async function TermGroupDetailPageRoute({ params }: PageProps) {
  const { workspaceIndex, termGroupId } = await params;

  return (
    <TermGroupDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      groupId={termGroupId}
    />
  );
}
