import { DataSourceMenuEditRoutePage } from "@/components/data-sources/data-source-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; id: string }>;
};

export default async function EditWebsiteJobPage({ params }: PageProps) {
  const { workspaceIndex, id } = await params;

  return (
    <DataSourceMenuEditRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
      dataSourceId={id}
    />
  );
}
