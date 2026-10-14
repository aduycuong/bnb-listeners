"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { setSyncedToken } from "@/lib/auth/synced-session-client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/content-items", label: "Content items" },
  { href: "/admin/collect-runs", label: "Collect runs" },
  { href: "/admin/refresh-schedules", label: "Refresh schedules" },
  { href: "/admin/scheduler", label: "Scheduler" },
  { href: "/admin/personas", label: "Personas" },
  { href: "/admin/panels", label: "Panels" },
  { href: "/admin/generate", label: "Generate" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

/** Admin header with section nav and sign-out. */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await getFirebaseAuth()?.signOut();
    await signOutAction();
    setSyncedToken(null);
    queryClient.clear();
    router.replace("/admin/sign-in");
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-heading text-base font-semibold">
            Admin
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <Link href="/" className="hover:text-foreground">
              App
            </Link>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
                isActive(pathname, item.href)
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
