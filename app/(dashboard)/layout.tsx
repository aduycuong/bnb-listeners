"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loading, user } = useAuth();
  const { t } = useT("common");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [loading, user, router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-xs">
        {t("authenticating")}
      </div>
    );
  }

  return children;
}
