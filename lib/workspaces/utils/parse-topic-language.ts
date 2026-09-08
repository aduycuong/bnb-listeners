import type { TopicLanguage } from "../constants";
import { DEFAULT_TOPIC_LANGUAGE, TOPIC_LANGUAGES } from "../constants";

export function parseTopicLanguage(value: string): TopicLanguage {
  if ((TOPIC_LANGUAGES as readonly string[]).includes(value)) {
    return value as TopicLanguage;
  }
  return DEFAULT_TOPIC_LANGUAGE;
}
