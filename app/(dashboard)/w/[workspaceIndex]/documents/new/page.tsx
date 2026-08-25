import { DocumentNewRoutePage } from "@/components/documents/document-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewDocumentPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return <DocumentNewRoutePage workspaceIndexParam={workspaceIndex} />;
}
