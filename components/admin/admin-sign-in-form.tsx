"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { syncSessionAction } from "@/lib/auth/actions";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

const NOT_ADMIN = "This account does not have the admin role.";

function getRedirect(value: string | null): string {
  return value?.startsWith("/admin") && !value.startsWith("/admin/sign-in")
    ? value
    : "/admin";
}

function getErrorMessage(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Invalid email or password.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign-in popup was closed.";
  }
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/**
 * Admin sign-in. Uses the app's Firebase auth and session cookie, then checks
 * the `role` custom claim; the token is refreshed first so a role set by
 * `scripts/set-firebase-user-role.ts` is picked up without signing out.
 */
export function AdminSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = getRedirect(searchParams.get("redirect"));

  const [checking, setChecking] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enter(user: User): Promise<boolean> {
    const result = await user.getIdTokenResult(true);
    if (result.claims.role !== "admin") {
      setCurrentEmail(user.email);
      return false;
    }

    await syncSessionAction(result.token);
    router.replace(redirect);
    router.refresh();
    return true;
  }

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured: nothing to wait for, show the notice.
      void Promise.resolve().then(() => setChecking(false));
      return;
    }

    // Already signed in (e.g. the session cookie expired): go straight in when admin.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (!user) {
        setChecking(false);
        return;
      }
      enter(user)
        .catch(() => false)
        .then((entered) => {
          if (!entered) setChecking(false);
        });
    });

    return unsubscribe;
    // Runs once on mount; `enter` only reads the redirect computed above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(run: () => Promise<User>) {
    setError(null);
    setLoading(true);
    try {
      const user = await run();
      if (!(await enter(user))) setError(NOT_ADMIN);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // `checking` is true on the server render, so Firebase is only read client-side.
  if (checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>Checking session…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const auth = getFirebaseAuth();

  if (!isFirebaseConfigured() || !auth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>Firebase is not configured.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin sign in</CardTitle>
        <CardDescription>
          {currentEmail
            ? `Signed in as ${currentEmail}, which is not an admin. Sign in with another account.`
            : "Accounts with the admin role only."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(async () => {
              const credential = await signInWithEmailAndPassword(auth, email, password);
              return credential.user;
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : "Sign in"}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={() =>
            void signIn(async () => {
              const credential = await signInWithPopup(auth, new GoogleAuthProvider());
              return credential.user;
            })
          }
        >
          Continue with Google
        </Button>
      </CardContent>
    </Card>
  );
}
