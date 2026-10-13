import { Suspense } from "react";

import { AdminCollectRunsPage } from "@/components/admin/admin-collect-runs-page";

export default function AdminCollectRunsRoute() {
  return (
    <Suspense>
      <AdminCollectRunsPage />
    </Suspense>
  );
}
