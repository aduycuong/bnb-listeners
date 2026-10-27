import { ProjectSectionPage } from "@/components/projects/project-section-page";

type PageProps = {
  params: Promise<{
    workspaceIndex: string;
    projectIndex: string;
    section: string;
  }>;
};

export default async function ProjectSectionRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex, section } = await params;

  return (
    <ProjectSectionPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
      section={section}
    />
  );
}
