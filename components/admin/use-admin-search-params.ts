"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * List filters kept in the URL so a filtered view can be linked and survives
 * reloads. Changing any filter other than `page` resets the page.
 */
export function useAdminSearchParams<K extends string>(keys: readonly K[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = Object.fromEntries(
    keys.map((key) => [key, searchParams.get(key) ?? ""]),
  ) as Record<K, string>;

  const setValue = useCallback(
    (key: K | "page", value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  return { values, page, setValue };
}
