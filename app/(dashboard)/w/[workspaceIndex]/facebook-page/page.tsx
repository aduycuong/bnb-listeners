import { DataSourceMenuListRoutePage } from "@/components/data-sources/data-source-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function FacebookPageJobsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <DataSourceMenuListRoutePage
      jobMenuKey="facebook-page"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
