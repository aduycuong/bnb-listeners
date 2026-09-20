type DocumentListPageRow = {
  id: string;
  parentDocumentId: string | null;
};

export function orderDocumentListPageRows<T extends DocumentListPageRow>(
  rows: T[],
  rootIds: string[],
): T[] {
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const childrenByParentId = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.parentDocumentId || !rootIds.includes(row.parentDocumentId)) {
      continue;
    }

    const siblings = childrenByParentId.get(row.parentDocumentId) ?? [];
    siblings.push(row);
    childrenByParentId.set(row.parentDocumentId, siblings);
  }

  const ordered: T[] = [];

  for (const rootId of rootIds) {
    const root = rowById.get(rootId);
    if (root) {
      ordered.push(root);
    }

    for (const child of childrenByParentId.get(rootId) ?? []) {
      if (child.id !== rootId) {
        ordered.push(child);
      }
    }
  }

  return ordered;
}
