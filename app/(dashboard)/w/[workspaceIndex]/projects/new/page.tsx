import { CreateProjectPage } from "@/components/projects/create-project-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewProjectPage({ params }: PageProps) {
  const { workspaceIndex } = await params;
  return <CreateProjectPage workspaceIndexParam={workspaceIndex} />;
}
