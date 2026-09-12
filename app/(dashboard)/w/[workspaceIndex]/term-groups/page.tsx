import { TermGroupListRoutePage } from "@/components/term-groups/term-group-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function TermGroupsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <TermGroupListRoutePage workspaceIndexParam={workspaceIndex} />;
}
