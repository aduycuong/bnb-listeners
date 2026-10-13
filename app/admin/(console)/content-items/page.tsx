import { Suspense } from "react";

import { AdminContentItemsPage } from "@/components/admin/admin-content-items-page";

export default function AdminContentItemsRoute() {
  return (
    <Suspense>
      <AdminContentItemsPage />
    </Suspense>
  );
}
