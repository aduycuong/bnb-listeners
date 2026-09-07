"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "topic-selected-ids:";

function storageKey(workspaceId: string) {
  return `${STORAGE_KEY_PREFIX}${workspaceId}`;
}

function readSelectedIds(workspaceId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId));
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.some((id) => typeof id !== "string")
    ) {
      return [];
    }

    return [...new Set(parsed)];
  } catch {
    return [];
  }
}

function writeSelectedIds(workspaceId: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const unique = [...new Set(ids)];
  const key = storageKey(workspaceId);

  if (unique.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(unique));
}

export function useSelectedTopicIds(workspaceId: string) {
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIdsState(readSelectedIds(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey(workspaceId)) {
        return;
      }

      setSelectedIdsState(readSelectedIds(workspaceId));
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [workspaceId]);

  const setSelectedIds = useCallback(
    (ids: string[]) => {
      const unique = [...new Set(ids)];
      setSelectedIdsState(unique);
      writeSelectedIds(workspaceId, unique);
    },
    [workspaceId],
  );

  const toggleSelected = useCallback(
    (id: string) => {
      setSelectedIdsState((current) => {
        const next = current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id];
        writeSelectedIds(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const removeSelected = useCallback(
    (id: string) => {
      setSelectedIdsState((current) => {
        if (!current.includes(id)) {
          return current;
        }

        const next = current.filter((value) => value !== id);
        writeSelectedIds(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const clearSelected = useCallback(() => {
    setSelectedIdsState([]);
    writeSelectedIds(workspaceId, []);
  }, [workspaceId]);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    toggleSelected,
    removeSelected,
    setSelectedIds,
    clearSelected,
  };
}
