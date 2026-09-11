import type { TermLanguage } from "../constants";
import { DEFAULT_TERM_LANGUAGE, TERM_LANGUAGES } from "../constants";

export function parseTermLanguage(value: string): TermLanguage {
  if ((TERM_LANGUAGES as readonly string[]).includes(value)) {
    return value as TermLanguage;
  }
  return DEFAULT_TERM_LANGUAGE;
}
