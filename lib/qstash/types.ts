import type { FlowControl } from "@upstash/qstash";
import type { z } from "zod";

import type {
  QstashJobEnvelope,
  addJobRequestSchema,
  scheduleJobRequestSchema,
} from "./schema";

export type AddJobParams = Omit<
  z.infer<typeof addJobRequestSchema>,
  "flowControl"
> & {
  userId: string;
  flowControl?: FlowControl;
};

export type AddJobResult = {
  messageId: string;
};

export type ScheduleJobParams = z.infer<typeof scheduleJobRequestSchema> & {
  userId: string;
};

export type ScheduleJobResult = {
  scheduleId: string;
};

export type DispatchQstashJobParams = QstashJobEnvelope;

export type DispatchQstashJobResult = {
  ok: true;
};

