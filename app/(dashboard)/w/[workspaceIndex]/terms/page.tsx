import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function LegacyTermsRedirect({ params }: PageProps) {
  const { workspaceIndex } = await params;
  redirect(`/w/${workspaceIndex}/p/0/terms`);
}
