import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

export default async function ProjectLabelSampleRedirect({ params }: PageProps) {
  const { workspaceIndex, projectIndex } = await params;
  redirect(`/w/${workspaceIndex}/p/${projectIndex}/admin/mentions/label`);
}
