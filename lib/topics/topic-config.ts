export const TOPIC_SEGMENT = "topics";

export const TOPIC_CREATED_BY = {
  admin: "admin",
  llmClassifier: "llm_classifier",
} as const;

export const TOPIC_CONFIG = {
  segment: TOPIC_SEGMENT,
  listTitle: "Topics",
  listDescription:
    "Subject taxonomy used to classify documents in this workspace.",
  emptyTitle: "No topics yet",
  emptyDescription: "Add a topic to start classifying documents.",
  createLabel: "Add topic",
  formCreateTitle: "Add topic",
  formCreateDescription:
    "Create a topic for classification. New topics are verified by default.",
  formEditTitle: "Edit topic",
  formEditDescription:
    "Update the topic name, description, parent, or verification.",
} as const;

export function getTopicHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${TOPIC_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
