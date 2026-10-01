import { notFound } from "next/navigation";

import { ProjectSectionPage } from "@/components/projects/project-section-page";
import { isProjectDemoSection } from "@/lib/dashboard/nav-items";

type PageProps = {
  params: Promise<{
    workspaceIndex: string;
    projectIndex: string;
    section: string;
  }>;
};

export default async function ProjectDemoSectionRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex, section } = await params;

  if (!isProjectDemoSection(section)) {
    notFound();
  }

  return (
    <ProjectSectionPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
      section={section}
    />
  );
}
