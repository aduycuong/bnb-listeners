import { z } from "zod";

import { TOPIC_MERGE_MAX_SOURCES } from "./topic-config";

export const createTopicBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Description must be 500 characters or fewer." })
    .optional(),
});

export const updateTopicBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Name is required." })
      .max(100, { error: "Name must be 100 characters or fewer." })
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, { error: "Description must be 500 characters or fewer." })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided",
  });

export const mergeTopicsNewTargetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Description must be 500 characters or fewer." })
    .optional(),
});

export const mergeTopicsBodySchema = z
  .object({
    sourceIds: z
      .array(z.uuid())
      .min(1, { error: "At least one source topic is required." })
      .max(TOPIC_MERGE_MAX_SOURCES, {
        error: `Cannot merge more than ${TOPIC_MERGE_MAX_SOURCES} source topics at once.`,
      }),
    targetId: z.uuid().optional(),
    newTopic: mergeTopicsNewTargetSchema.optional(),
  })
  .refine((data) => Boolean(data.targetId) !== Boolean(data.newTopic), {
    error: "Provide either targetId or newTopic, not both.",
  });

export const topicFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer." }),
});
