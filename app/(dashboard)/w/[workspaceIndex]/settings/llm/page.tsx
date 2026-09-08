import { WorkspaceLlmSettings } from "@/components/workspace/workspace-llm-settings";
import { getWorkspaceRouteContext } from "@/lib/workspaces/services/get-workspace-route-context";

type WorkspaceLlmSettingsPageProps = {
  params: Promise<{ workspaceIndex: string }>;
};

export default async function WorkspaceLlmSettingsPage({
  params,
}: WorkspaceLlmSettingsPageProps) {
  const { workspaceIndex: workspaceIndexParam } = await params;
  const { workspace } = await getWorkspaceRouteContext(workspaceIndexParam);

  return <WorkspaceLlmSettings workspace={workspace} />;
}
