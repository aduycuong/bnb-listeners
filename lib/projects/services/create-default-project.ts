import { seedDemoProjects } from "./seed-demo-projects";

export async function createDefaultProject(params: {
  workspaceId: string;
}): Promise<void> {
  await seedDemoProjects({ workspaceId: params.workspaceId });
}
