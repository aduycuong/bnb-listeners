import { DataSourceGroupDetailRoutePage } from "@/components/data-source-groups/data-source-group-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string; groupId: string }>;
};

export default async function DataSourceGroupDetailPageRoute({
  params,
}: PageProps) {
  const { workspaceIndex, groupId } = await params;

  return (
    <DataSourceGroupDetailRoutePage
      workspaceIndexParam={workspaceIndex}
      groupId={groupId}
    />
  );
}
