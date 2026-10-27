/** Bar pinned to the bottom of the scroll area, as wide as the single-column compare forms. */
export function CompareFormActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-7 md:px-7">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}
