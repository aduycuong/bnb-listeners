import { ProjectTopicsPage } from "@/components/topics/project-topics-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectTopicsRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectTopicsPage workspaceIndexParam={workspaceIndex} projectIndexParam={projectIndex} />
  );
}
