export function parseWorkspaceIndexParam(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function clampWorkspaceIndex(index: number, workspaceCount: number): number {
  if (workspaceCount <= 0) {
    return 0;
  }

  return Math.min(index, workspaceCount - 1);
}
