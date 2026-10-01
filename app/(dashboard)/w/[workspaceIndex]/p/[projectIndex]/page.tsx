import { ProjectOverviewPage } from "@/components/projects/project-overview-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectOverviewPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
    />
  );
}
