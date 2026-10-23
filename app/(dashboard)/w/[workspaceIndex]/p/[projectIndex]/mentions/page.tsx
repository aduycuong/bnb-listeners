import { ProjectMentionsReportPage } from "@/components/mentions/project-mentions-report";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectMentionsRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectMentionsReportPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
    />
  );
}
