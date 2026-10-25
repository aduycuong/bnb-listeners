"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type ProjectConfigNavItem = {
  id: string;
  label: string;
  hint?: string;
  dirty?: boolean;
  invalid?: boolean;
};

/** Distance from the top of the scroll area at which a section counts as current. */
const ACTIVE_OFFSET = 120;

function getScrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

/** Id of the section the user is reading, following the dashboard scroll area. */
function useActiveSection(ids: string[]) {
  const key = ids.join("|");
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const sectionIds = key.split("|");
    const first = document.getElementById(sectionIds[0]);
    const scroller = first ? getScrollParent(first) : null;
    if (!scroller) return;

    function update() {
      if (!scroller) return;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      const top = scroller.getBoundingClientRect().top + ACTIVE_OFFSET;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= top) current = id;
      }
      setActive(atBottom ? sectionIds[sectionIds.length - 1] : current);
    }

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [key]);

  return [active, setActive] as const;
}

/** Table of contents of the settings form, with unsaved and invalid markers per section. */
export function ProjectConfigSectionNav({ items }: { items: ProjectConfigNavItem[] }) {
  const [active, setActive] = useActiveSection(items.map((item) => item.id));

  return (
    <nav aria-label="Các phần cấu hình">
      <ol className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-xl border-l-2 px-3 py-2 transition-colors",
                active === item.id
                  ? "border-primary bg-primary/8"
                  : "border-transparent hover:bg-muted",
              )}
              onClick={(event) => {
                event.preventDefault();
                document
                  .getElementById(item.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                setActive(item.id);
              }}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[13px] leading-tight font-medium",
                    active !== item.id && "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {item.hint}
                  </span>
                ) : null}
              </span>
              {item.invalid ? (
                <span
                  className="mt-1 size-2 shrink-0 rounded-full bg-destructive"
                  title="Có lỗi cần sửa"
                />
              ) : item.dirty ? (
                <span
                  className="mt-1 size-2 shrink-0 rounded-full bg-primary"
                  title="Có thay đổi chưa lưu"
                />
              ) : null}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
