"use client";

import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="md:hidden" />
      <DashboardBreadcrumb />
    </header>
  );
}
