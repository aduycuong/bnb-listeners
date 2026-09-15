import { DataSourceMenuListRoutePage } from "@/components/data-sources/data-source-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function WebsiteJobsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <DataSourceMenuListRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
