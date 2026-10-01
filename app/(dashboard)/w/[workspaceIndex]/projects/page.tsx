import { ProjectListPage } from "@/components/projects/project-list-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function ProjectsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;
  return <ProjectListPage workspaceIndexParam={workspaceIndex} />;
}
