"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [loading, user, router]);

  // Wait until the user is loaded before rendering the layout, so that children never have to handle a "loading user" state.
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-xs">
        Authenticating...
      </div>
    );
  }

  return children;
}
