import type { TopicLanguage } from "@/lib/workspaces/constants";

export function buildTopicLanguageGuideline(language: TopicLanguage): string {
  switch (language) {
    case "vietnamese":
      return "Write proposed topic names and descriptions in Vietnamese.";
    case "english":
      return "Write proposed topic names and descriptions in English.";
    case "auto":
      return "Write proposed topic names and descriptions in the same language as the document.";
  }
}
