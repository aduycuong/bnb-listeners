import {
  DEFAULT_TOPIC_LANGUAGE,
  type TopicLanguage,
} from "../constants";
import { topicLanguageSchema } from "../schema";

export function parseTopicLanguage(value: string): TopicLanguage {
  const parsed = topicLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_TOPIC_LANGUAGE;
}
