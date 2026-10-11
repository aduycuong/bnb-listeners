import {
  collectSourceWorkflow,
  collectSourceWorkflowOptions,
} from "@/lib/connectors/workflows/collect-source";
import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";

export const { POST } = serveWorkflow(
  "collect-source",
  collectSourceWorkflow,
  collectSourceWorkflowOptions,
);
