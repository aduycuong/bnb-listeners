/**
 * `text.slice(0, end)` that never ends on half of a surrogate pair (emoji):
 * a lone surrogate makes the JSON of an LLM request invalid.
 */
export function safeSlice(text: string, end: number): string {
  const sliced = text.slice(0, end);
  const last = sliced.charCodeAt(sliced.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? sliced.slice(0, -1) : sliced;
}
