import { ProjectTopicsReportPage } from "@/components/topics/project-topics-report-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectTopicsRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectTopicsReportPage
      workspaceIndexParam={workspaceIndex}
      projectIndexParam={projectIndex}
    />
  );
}
