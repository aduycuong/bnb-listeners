import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-xs text-muted-foreground">Admin</p>
          <h1 className="text-lg font-semibold">System operations</h1>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to app
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
