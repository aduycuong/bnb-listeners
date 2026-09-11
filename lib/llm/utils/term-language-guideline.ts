import type { TermLanguage } from "@/lib/workspaces/constants";

export function buildTermLanguageGuideline(language: TermLanguage): string {
  switch (language) {
    case "vietnamese":
      return "Write proposed term names and descriptions in Vietnamese.";
    case "english":
      return "Write proposed term names and descriptions in English.";
    case "auto":
      return "Write proposed term names and descriptions in the same language as the document.";
  }
}
