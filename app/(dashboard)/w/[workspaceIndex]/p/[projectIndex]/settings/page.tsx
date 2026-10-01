import { ProjectSettingsPage } from "@/components/projects/project-settings-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectSettingsRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectSettingsPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
    />
  );
}
