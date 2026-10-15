import {
  topicProjectWorkflow,
  topicProjectWorkflowOptions,
} from "@/lib/topics/workflows/topic-project-workflow";
import { serveWorkflow } from "@/lib/workflows/utils/serve-workflow";

export const { POST } = serveWorkflow(
  "topic-project",
  topicProjectWorkflow,
  topicProjectWorkflowOptions,
);
