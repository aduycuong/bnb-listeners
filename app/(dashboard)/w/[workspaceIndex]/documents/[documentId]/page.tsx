import { DocumentDetailRoutePage } from "@/components/documents/document-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; documentId: string }>;
};

export default async function DocumentDetailPageRoute({ params }: PageProps) {
  const { workspaceIndex, documentId } = await params;

  return (
    <DocumentDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      documentId={documentId}
    />
  );
}
