import { z } from "zod";

export const listTopicsQuerySchema = z.object({
  /** Hidden topics are listed only when asked. */
  includeHidden: z.enum(["0", "1"]).default("0"),
});

export const updateTopicBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  status: z.enum(["active", "hidden"]).optional(),
});

export const mergeTopicBodySchema = z.object({
  /** The topic that keeps the mentions. */
  intoId: z.uuid(),
});

/** Edit dialog of the Topics page. */
export const topicFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên topic.").max(120),
  description: z.string().trim().max(500),
});

export type TopicFormValues = z.infer<typeof topicFormSchema>;
