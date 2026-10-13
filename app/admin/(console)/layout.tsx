import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminNoAccess } from "@/components/admin/admin-no-access";
import { AdminShell } from "@/components/admin/admin-shell";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Admin",
};

/** Admin pages need a session with the `admin` role; the API routes check it again. */
export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/admin/sign-in");
  }

  if (session.role !== "admin") {
    return <AdminNoAccess email={session.email} />;
  }

  return <AdminShell email={session.email}>{children}</AdminShell>;
}
