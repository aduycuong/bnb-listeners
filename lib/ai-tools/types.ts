import type { z } from "zod";

import type { ApiKeyScope } from "@/lib/unkey/constants";

/** Who calls a tool: an API key of a workspace (D27). */
export type AiToolContext = {
  workspaceId: string;
  /** Member the call runs as. */
  userId: string;
  /** Their email: default recipient of a new project's alerts, as in the wizard. */
  userEmail: string | null;
  scopes: ApiKeyScope[];
  /** Projects the key may read; null is every project of the workspace. */
  projectIds: string[] | null;
};

/**
 * A tool shared by the MCP server and the chat agent (D27). Tools call services of the
 * other modules and return plain JSON; the caller turns the result into its own format.
 */
export type AiTool<Input extends z.ZodObject = z.ZodObject> = {
  name: string;
  /** Scope a key needs to see and call the tool; null: any key. */
  scope: ApiKeyScope | null;
  /** The tool changes data (creates a project); read-only when left out. */
  writes?: boolean;
  /** Read by the model: say what the tool answers and when to call it. */
  description: string;
  inputSchema: Input;
  run(input: z.output<Input>, ctx: AiToolContext): Promise<unknown>;
};
