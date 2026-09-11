import type { TermLanguage } from "@/lib/workspaces/constants";

export function buildTermLanguageGuideline(language: TermLanguage): string {
  switch (language) {
    case "vietnamese":
      return "Luôn viết tên và mô tả term bằng tiếng Việt.";
    case "english":
      return "Luôn viết tên và mô tả term bằng tiếng Anh.";
    case "auto":
      return "Viết tên và mô tả term cùng ngôn ngữ với tài liệu.";
  }
}
