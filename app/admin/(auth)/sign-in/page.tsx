import { Suspense } from "react";

import { AdminSignInForm } from "@/components/admin/admin-sign-in-form";

export default function AdminSignInPage() {
  return (
    <Suspense>
      <AdminSignInForm />
    </Suspense>
  );
}
