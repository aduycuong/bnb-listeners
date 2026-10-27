import { Suspense } from "react";

import { AdminSpendingPage } from "@/components/admin/admin-spending-page";

export default function AdminSpendingRoute() {
  return (
    <Suspense>
      <AdminSpendingPage />
    </Suspense>
  );
}
