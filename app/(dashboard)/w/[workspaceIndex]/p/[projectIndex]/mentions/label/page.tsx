import { LabelSamplePage } from "@/components/mentions/label-sample-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectLabelSampleRoute({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  return <LabelSamplePage workspaceIndexParam={workspaceIndex} projectIndexParam={projectIndex} />;
}
