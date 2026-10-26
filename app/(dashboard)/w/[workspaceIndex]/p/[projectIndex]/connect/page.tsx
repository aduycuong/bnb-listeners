import { ProjectAiConnectPage } from "@/components/projects/project-ai-connect-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectAiConnectRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return (
    <ProjectAiConnectPage workspaceIndexParam={workspaceIndex} projectIndexParam={projectIndex} />
  );
}
