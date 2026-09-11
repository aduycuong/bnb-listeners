"use client";

import { useCallback, useEffect, useState } from "react";

export function useSelectedTermIds(workspaceId: string) {
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIdsState([]);
  }, [workspaceId]);

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState([...new Set(ids)]);
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIdsState((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelectedIdsState((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current,
    );
  }, []);

  const removeSelectedMany = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const toRemove = new Set(ids);
    setSelectedIdsState((current) =>
      current.some((id) => toRemove.has(id))
        ? current.filter((id) => !toRemove.has(id))
        : current,
    );
  }, []);

  const clearSelected = useCallback(() => {
    setSelectedIdsState([]);
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    toggleSelected,
    removeSelected,
    removeSelectedMany,
    setSelectedIds,
    clearSelected,
  };
}
