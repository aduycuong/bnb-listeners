import { DashboardHomeRoutePage } from "@/components/dashboard/dashboard-home-route-page";

type PageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function WorkspaceDashboardPage({ params }: PageProps) {
  const { workspaceIndex } = await params;
  return <DashboardHomeRoutePage workspaceIndexParam={workspaceIndex} />;
}
