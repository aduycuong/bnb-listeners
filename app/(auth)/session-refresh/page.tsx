"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { syncSessionAction } from "@/lib/auth/actions";
import { DEFAULT_REDIRECT } from "@/lib/auth/constants";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function SessionRefreshContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || DEFAULT_REDIRECT;

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!isFirebaseConfigured()) {
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(redirect)}&reason=session-expired`,
        );
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(redirect)}&reason=session-expired`,
        );
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(redirect)}&reason=session-expired`,
        );
        return;
      }

      try {
        const token = await user.getIdToken(true);
        if (cancelled) return;
        await syncSessionAction(token);
        if (cancelled) return;
        router.replace(redirect);
      } catch {
        if (!cancelled) {
          router.replace(
            `/sign-in?redirect=${encodeURIComponent(redirect)}&reason=session-expired`,
          );
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router, redirect]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-neutral-500">Restoring your session…</p>
    </div>
  );
}

export default function SessionRefreshPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <p className="text-sm text-neutral-500">Restoring your session…</p>
        </div>
      }
    >
      <SessionRefreshContent />
    </Suspense>
  );
}
