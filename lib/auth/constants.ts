export const AUTH_COOKIE_NAME = "auth-token";

export const DEFAULT_REDIRECT = "/";

/** Path prefixes that require an auth cookie (see `isProtected`). */
export const PROTECTED_PREFIXES = ["/w", "/profile"];

export const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password"];

export const PUBLIC_PAGES = ["/privacy-policy"];

/**
 * API path prefixes that skip session auth.
 * Each route must verify requests with its own secret or signature mechanism.
 */
export const UNPROTECTED_API_PREFIXES = [
  "/api/webhooks",
  "/api/qstash/callback",
] as const;
