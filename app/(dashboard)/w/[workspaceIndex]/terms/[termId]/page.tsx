import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceIndex: string; termId: string }>;
};

export default async function LegacyTermDetailRedirect({ params }: PageProps) {
  const { workspaceIndex, termId } = await params;
  redirect(`/w/${workspaceIndex}/p/0/terms/${termId}`);
}
