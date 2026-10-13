import { Suspense } from "react";

import { AdminRefreshSchedulesPage } from "@/components/admin/admin-refresh-schedules-page";

export default function AdminRefreshSchedulesRoute() {
  return (
    <Suspense>
      <AdminRefreshSchedulesPage />
    </Suspense>
  );
}
