import { DocumentEditRoutePage } from "@/components/documents/document-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; id: string }>;
};

export default async function EditDocumentPage({ params }: PageProps) {
  const { workspaceIndex, id } = await params;

  return (
    <DocumentEditRoutePage
      workspaceIndexParam={workspaceIndex}
      documentId={id}
    />
  );
}
