import type { z } from "zod";

import type { AiTool } from "../types";

/** Keeps the input type of a tool's `run` tied to its schema. */
export function defineAiTool<Input extends z.ZodObject>(tool: AiTool<Input>): AiTool<Input> {
  return tool;
}
