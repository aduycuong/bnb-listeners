import { redirect } from "next/navigation";

import { ProfileSettings } from "@/components/dashboard/profile-settings";
import { getSession } from "@/lib/auth/session";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <ProfileSettings user={session} />;
}
