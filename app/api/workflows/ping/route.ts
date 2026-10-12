import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";
import {
  pingWorkflow,
  pingWorkflowPayloadSchema,
} from "@/lib/workflows/workflows/ping";

export const { POST } = serveWorkflow("ping", pingWorkflow, {
  schema: pingWorkflowPayloadSchema,
});
