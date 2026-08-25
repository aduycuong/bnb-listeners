import "server-only";

import type { I18nConfig } from "next-i18next/proxy";

import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/constants";

export { DEFAULT_LOCALE, FALLBACK_LOCALE } from "@/lib/i18n/constants";

const localesDir = "app/i18n/locales";

const resourceLoader: I18nConfig["resourceLoader"] =
  process.env.NODE_ENV === "development"
    ? async (language, namespace) => {
        const fs = await import("fs/promises");
        const path = await import("path");
        const content = await fs.readFile(
          path.resolve(process.cwd(), `${localesDir}/${language}/${namespace}.json`),
          "utf-8",
        );
        return JSON.parse(content) as Record<string, unknown>;
      }
    : (language, namespace) =>
        import(`./app/i18n/locales/${language}/${namespace}.json`);

const i18nConfig: I18nConfig = {
  supportedLngs: [...SUPPORTED_LANGUAGES],
  fallbackLng: FALLBACK_LOCALE,
  localeInPath: false,
  defaultNS: "common",
  ns: ["common", "auth", "dashboard", "forms"],
  reloadOnPrerender: process.env.NODE_ENV === "development",
  resourceLoader,
};

export default i18nConfig;
