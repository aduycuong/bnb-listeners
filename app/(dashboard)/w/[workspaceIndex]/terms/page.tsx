import { TermListRoutePage } from "@/components/terms/term-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function TermsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <TermListRoutePage workspaceIndexParam={workspaceIndex} />;
}
