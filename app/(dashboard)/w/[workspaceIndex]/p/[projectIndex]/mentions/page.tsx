import { ProjectMentionsPage } from "@/components/mentions/project-mentions-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectMentionsRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectMentionsPage workspaceIndexParam={workspaceIndex} projectIndexParam={projectIndex} />
  );
}
