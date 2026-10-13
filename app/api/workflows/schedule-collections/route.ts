import { scheduleCollectionsWorkflow } from "@/lib/connectors/workflows/schedule-collections-workflow";
import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";

export const { POST } = serveWorkflow(
  "schedule-collections",
  scheduleCollectionsWorkflow,
);
