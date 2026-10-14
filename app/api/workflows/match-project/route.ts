import {
  matchProjectWorkflow,
  matchProjectWorkflowOptions,
} from "@/lib/matching/workflows/match-project-workflow";
import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";

export const { POST } = serveWorkflow(
  "match-project",
  matchProjectWorkflow,
  matchProjectWorkflowOptions,
);
