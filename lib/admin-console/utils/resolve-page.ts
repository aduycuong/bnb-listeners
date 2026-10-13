import type { PageParams } from "../types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Page (1-based) and page size clamped to sane bounds, plus the row offset. */
export function resolvePage(params: PageParams) {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}
