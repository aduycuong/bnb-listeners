import type { Metadata } from "next";

import { AuthBrandHeader } from "@/components/auth/auth-brand-header";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a BNB Chat Agent account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-900">
      <AuthBrandHeader />
      <div className="mt-8 w-full max-w-100">{children}</div>
    </div>
  );
}
