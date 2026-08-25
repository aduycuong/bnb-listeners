export function deriveRoleFromCustomClaims(claims: unknown): string | undefined {
  if (!claims || typeof claims !== "object") return undefined;

  const role = (claims as { role?: unknown }).role;
  if (typeof role !== "string") return undefined;

  const normalized = role.trim();
  return normalized || undefined;
}
