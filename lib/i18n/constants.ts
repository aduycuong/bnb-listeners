export const DEFAULT_LOCALE = "vi";
export const FALLBACK_LOCALE = "en";

export const SUPPORTED_LANGUAGES = ["en", "vi"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
