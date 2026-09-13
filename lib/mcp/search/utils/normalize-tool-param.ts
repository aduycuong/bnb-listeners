/** OpenAI strict tool schemas use null instead of omitting optional args. */
export function normalizeToolParam<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
