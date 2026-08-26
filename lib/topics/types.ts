import type { z } from "zod";

import type {
  createTopicBodySchema,
  topicFormSchema,
  updateTopicBodySchema,
} from "./schema";

export type CreateTopicBody = z.infer<typeof createTopicBodySchema>;
export type CreateTopicParams = CreateTopicBody;
export type CreateTopicResult = TopicListItem;

export type UpdateTopicBody = z.infer<typeof updateTopicBodySchema>;
export type UpdateTopicParams = { id: string } & UpdateTopicBody;
export type UpdateTopicResult = TopicListItem;

export type DeleteTopicParams = { id: string };
export type DeleteTopicResult = { id: string; message: string };

export type ListTopicsParams = {
  verified?: boolean;
};

export type TopicListItem = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  verified: boolean;
  createdBy: string;
  sourceDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTopicsResult = { items: TopicListItem[] };

export type TopicFormValues = z.infer<typeof topicFormSchema>;
