import { createProject } from "./create-project";

export async function createDefaultProject(params: {
  workspaceId: string;
  name: string;
}): Promise<{ id: string }> {
  const project = await createProject({
    workspaceId: params.workspaceId,
    name: params.name,
  });

  return { id: project.id };
}
