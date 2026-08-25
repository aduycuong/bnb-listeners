import {
  AUTH_PAGES,
  PROTECTED_PREFIXES,
  PUBLIC_PAGES,
  UNPROTECTED_API_PREFIXES,
} from "./constants";

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isUnprotectedApiRoute(pathname: string): boolean {
  return UNPROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function matchesProtectedPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtected(pathname: string): boolean {
  if (isPublicPage(pathname)) return false;
  if (isAuthPage(pathname)) return false;
  if (isUnprotectedApiRoute(pathname)) return false;
  return PROTECTED_PREFIXES.some((prefix) =>
    matchesProtectedPrefix(pathname, prefix),
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
