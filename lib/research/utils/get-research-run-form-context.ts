/** User-facing background for forms; legacy runs fall back to merged `background`. */
export function getResearchRunFormContext(run: {
  context: string | null;
  background: string | null;
}): string {
  const context = run.context?.trim();
  if (context) {
    return context;
  }

  return run.background?.trim() ?? "";
}
