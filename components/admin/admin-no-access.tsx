"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAction } from "@/lib/auth/actions";
import { setSyncedToken } from "@/lib/auth/synced-session-client";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** Shown to a signed-in user without the admin role. */
export function AdminNoAccess({ email }: { email: string }) {
  const router = useRouter();

  async function switchAccount() {
    await getFirebaseAuth()?.signOut();
    await signOutAction();
    setSyncedToken(null);
    router.replace("/admin/sign-in");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-100">
        <CardHeader>
          <CardTitle>No admin access</CardTitle>
          <CardDescription>{email} does not have the admin role.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => void switchAccount()}>Use another account</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Back to app
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
