export function parseProjectIndexParam(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function clampProjectIndex(index: number, projectCount: number): number {
  if (projectCount <= 0) {
    return 0;
  }

  return Math.min(index, projectCount - 1);
}
