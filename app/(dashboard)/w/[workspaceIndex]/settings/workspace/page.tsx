import { WorkspaceSettings } from "@/components/workspace/workspace-settings";
import { getWorkspaceRouteContext } from "@/lib/workspaces/services/get-workspace-route-context";

type WorkspaceSettingsPageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function WorkspaceSettingsPage({
  params,
}: WorkspaceSettingsPageProps) {
  const { workspaceIndex: workspaceIndexParam } = await params;
  const { workspace, workspaces, workspaceIndex } =
    await getWorkspaceRouteContext(workspaceIndexParam);

  return (
    <WorkspaceSettings
      workspace={workspace}
      workspaces={workspaces}
      workspaceIndex={workspaceIndex}
    />
  );
}
