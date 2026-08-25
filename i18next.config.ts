import { defineConfig } from "i18next-cli";

export default defineConfig({
  locales: ["en", "vi"],
  extract: {
    input: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    output: "app/i18n/locales/{{language}}/{{namespace}}.json",
    defaultNS: "common",
    useTranslationNames: ["useTranslation", "getT", "useT"],
  },
});
