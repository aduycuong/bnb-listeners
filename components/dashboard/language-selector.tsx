"use client";

import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useChangeLanguage, useT } from "next-i18next/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/constants";

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((value) => ({
  value,
  labelKey: `language.${value}` as const,
}));

export function LanguageSelector() {
  const { t: tCommon, i18n } = useT("common");
  const changeLanguage = useChangeLanguage();
  const currentLanguage = i18n.language?.startsWith("vi") ? "vi" : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={tCommon("language.label")}
            className="size-8"
          />
        }
      >
        <LanguagesIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          {LANGUAGE_OPTIONS.map(({ value, labelKey }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => {
                void changeLanguage(value);
              }}
            >
              {tCommon(labelKey)}
              {currentLanguage === value ? (
                <CheckIcon className="ml-auto size-4 text-muted-foreground" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
