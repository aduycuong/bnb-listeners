import {
  enrichProjectWorkflow,
  enrichProjectWorkflowOptions,
} from "@/lib/enrichment/workflows/enrich-project-workflow";
import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";

export const { POST } = serveWorkflow(
  "enrich-project",
  enrichProjectWorkflow,
  enrichProjectWorkflowOptions,
);
