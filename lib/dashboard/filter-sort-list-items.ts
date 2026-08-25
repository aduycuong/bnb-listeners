export type ListSortOption =
  | "name-asc"
  | "name-desc"
  | "created-desc"
  | "created-asc";

export type FilterSortListItem = {
  name: string;
  description?: string;
  createdAt: string;
};

export function filterSortListItems<T extends FilterSortListItem>(
  items: T[],
  keyword: string,
  sort: ListSortOption,
): T[] {
  const query = keyword.trim().toLowerCase();

  const filtered = query
    ? items.filter((item) => {
        const haystack = [item.name, item.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
    : [...items];

  filtered.sort((left, right) => {
    switch (sort) {
      case "name-asc":
        return left.name.localeCompare(right.name);
      case "name-desc":
        return right.name.localeCompare(left.name);
      case "created-asc":
        return left.createdAt.localeCompare(right.createdAt);
      case "created-desc":
      default:
        return right.createdAt.localeCompare(left.createdAt);
    }
  });

  return filtered;
}

export const LIST_SORT_OPTIONS: {
  value: ListSortOption;
  label: string;
}[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "created-desc", label: "Newest first" },
  { value: "created-asc", label: "Oldest first" },
];
