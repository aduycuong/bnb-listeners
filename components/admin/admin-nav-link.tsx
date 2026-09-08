"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldIcon } from "lucide-react";

import { authMeQueryKey } from "@/components/admin/admin-query-keys";
import { Button } from "@/components/ui/button";

async function fetchAuthMe(): Promise<{ role: string }> {
  const res = await fetch("/api/auth/me");
  const data = (await res.json()) as { role?: string; error?: string; message?: string };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load session.");
  }

  return { role: data.role ?? "user" };
}

export function AdminNavLink() {
  const { data } = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchAuthMe,
    staleTime: 60_000,
  });

  if (data?.role !== "admin") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      aria-label="Admin system schedules"
      className="size-8"
      render={<Link href="/admin/system-schedules" />}
    >
      <ShieldIcon className="size-4" />
    </Button>
  );
}
