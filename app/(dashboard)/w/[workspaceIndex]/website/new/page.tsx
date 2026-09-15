import { DataSourceMenuNewRoutePage } from "@/components/data-sources/data-source-menu-route-pages";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function NewWebsiteJobPage({ params }: PageProps) {
  const { workspaceIndex } = await params;

  return (
    <DataSourceMenuNewRoutePage
      jobMenuKey="website"
      workspaceIndexParam={workspaceIndex}
    />
  );
}
