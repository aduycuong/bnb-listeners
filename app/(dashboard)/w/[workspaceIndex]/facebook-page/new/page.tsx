import { DataSourceMenuNewRoutePage } from "@/components/data-sources/data-source-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewFacebookPageJobPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <DataSourceMenuNewRoutePage
      jobMenuKey="facebook-page"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
