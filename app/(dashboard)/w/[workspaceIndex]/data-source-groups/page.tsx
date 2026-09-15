import { DataSourceGroupListRoutePage } from "@/components/data-source-groups/data-source-group-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function DataSourceGroupsPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <DataSourceGroupListRoutePage workspaceIndexParam={workspaceIndex} />
  );
}
