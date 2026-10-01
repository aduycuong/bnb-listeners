import { TermListRoutePage } from "@/components/terms/term-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function TermsPage({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;

  return (
    <TermListRoutePage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
    />
  );
}
