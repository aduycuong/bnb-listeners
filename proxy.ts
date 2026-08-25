import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createProxy } from "next-i18next/proxy";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { isTokenNotExpired } from "@/lib/auth/token";
import { isProtected } from "@/lib/auth/utils";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import i18nConfig from "./i18n.config";

const i18nProxy = createProxy({
  ...i18nConfig,
  fallbackLng: DEFAULT_LOCALE,
});

export function proxy(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const hasToken = !!token;
  const hasAuth = token ? isTokenNotExpired(token) : false;
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) {
    return i18nProxy(req);
  }

  if (hasToken && !hasAuth) {
    const refreshUrl = new URL("/session-refresh", req.url);
    refreshUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(refreshUrl);
  }

  if (!hasToken) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signIn);
  }

  return i18nProxy(req);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
