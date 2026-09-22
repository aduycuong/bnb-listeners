import { ResearchListRoutePage } from "@/components/research/research-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function ResearchPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <ResearchListRoutePage workspaceIndexParam={workspaceIndex} />;
}
