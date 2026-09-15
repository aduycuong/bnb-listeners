"use client";

import { ChevronDownIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DOCUMENT_TERM_FILTER_LABELS,
  DOCUMENT_TERM_FILTER_MODES,
  type DocumentTermFilterMode,
} from "@/lib/documents/document-term-filter-config";
import type { DocumentTermSummary } from "@/lib/documents/types";
import type { ListTermsResult, TermListItem } from "@/lib/terms/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentTermFilterSelectProps = {
  termFilterMode: DocumentTermFilterMode;
  onTermFilterModeChange: (mode: DocumentTermFilterMode) => void;
  disabled?: boolean;
};

type DocumentTermPickerProps = {
  workspaceId: string;
  selectedTerms: DocumentTermSummary[];
  onSelectedTermsChange: (terms: DocumentTermSummary[]) => void;
  disabled?: boolean;
};

type TermOption = {
  id: string;
  name: string;
  description: string | null;
};

async function searchTerms(
  workspaceId: string,
  search: string,
): Promise<TermListItem[]> {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set("search", search.trim());
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/terms?${params.toString()}`,
  );
  const data = (await res.json()) as ListTermsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not search terms.");
  }

  return data.items;
}

function toTermOption(term: DocumentTermSummary | TermListItem): TermOption {
  return {
    id: term.id,
    name: term.name,
    description: "description" in term ? term.description : null,
  };
}

export function DocumentTermFilterSelect({
  termFilterMode,
  onTermFilterModeChange,
  disabled = false,
}: DocumentTermFilterSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          />
        }
      >
        {DOCUMENT_TERM_FILTER_LABELS[termFilterMode]}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuRadioGroup
          value={termFilterMode}
          onValueChange={(value) =>
            onTermFilterModeChange(value as DocumentTermFilterMode)
          }
        >
          {DOCUMENT_TERM_FILTER_MODES.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {DOCUMENT_TERM_FILTER_LABELS[mode]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DocumentTermPicker({
  workspaceId,
  selectedTerms,
  onSelectedTermsChange,
  disabled = false,
}: DocumentTermPickerProps) {
  const anchor = useComboboxAnchor();
  const [inputValue, setInputValue] = useState("");
  const deferredSearch = useDeferredValue(inputValue);
  const [searchResults, setSearchResults] = useState<TermListItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>();

  const selectedTermIds = useMemo(
    () => new Set(selectedTerms.map((term) => term.id)),
    [selectedTerms],
  );

  const comboboxValue = useMemo(
    () => selectedTerms.map((term) => toTermOption(term)),
    [selectedTerms],
  );

  const selectableItems = useMemo(
    () =>
      searchResults
        .filter((term) => !selectedTermIds.has(term.id))
        .map((term) => toTermOption(term)),
    [searchResults, selectedTermIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setSearchLoading(true);
      setSearchError(undefined);

      try {
        const items = await searchTerms(workspaceId, deferredSearch);
        if (!cancelled) {
          setSearchResults(items);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(
            error instanceof Error ? error.message : "Could not search terms.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, workspaceId]);

  return (
    <Combobox
      multiple
      items={selectableItems}
      value={comboboxValue}
      onValueChange={(next) => {
        onSelectedTermsChange(
          next.map((term) => ({ id: term.id, name: term.name })),
        );
      }}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      filter={null}
      autoComplete="none"
      autoHighlight
      disabled={disabled}
      itemToStringLabel={(term) => term.name}
      itemToStringValue={(term) => term.id}
      isItemEqualToValue={(item, value) => item.id === value.id}
    >
      <ComboboxChips ref={anchor} className="w-full dark:bg-input/30">
        <ComboboxValue>
          {(values: TermOption[]) =>
            values.map((term) => (
              <ComboboxChip
                key={term.id}
                className="border border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200"
              >
                {term.name}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          placeholder="Search terms to filter..."
          aria-label="Search terms to filter documents"
        />
      </ComboboxChips>

      <ComboboxContent anchor={anchor}>
        {searchError ? (
          <p className="px-2 py-2 text-sm text-destructive">{searchError}</p>
        ) : null}
        <ComboboxEmpty>
          {searchLoading
            ? "Searching terms..."
            : deferredSearch.trim()
              ? "No matching terms."
              : "Type to search terms."}
        </ComboboxEmpty>
        <ComboboxList>
          {(term) => (
            <ComboboxItem key={term.id} value={term}>
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{term.name}</span>
                {term.description ? (
                  <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {term.description}
                  </span>
                ) : null}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
