import { DocumentListRoutePage } from "@/components/documents/document-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function DocumentsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <DocumentListRoutePage workspaceIndexParam={workspaceIndex} />;
}
