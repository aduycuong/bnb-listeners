"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  type Auth,
  type AuthProvider,
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
import { DEFAULT_REDIRECT } from "@/lib/auth/constants";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "auth/account-exists-with-different-credential") {
      return "An account already exists with a different sign-in method. Try Google instead.";
    }
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return "Invalid email or password.";
    }
    if (code === "auth/email-already-in-use") {
      return "Email is already in use.";
    }
  }
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "Something went wrong. Please try again.";
}

function SignInFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading…</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || DEFAULT_REDIRECT;

  const [auth, setAuth] = useState<Auth | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");

  useEffect(() => {
    setAuth(getFirebaseAuth());
    setConfigured(isFirebaseConfigured());
  }, []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!auth) {
      setError("Authentication is not configured.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      await syncSessionAction(token);
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: AuthProvider) {
    setError(null);
    if (!auth) {
      setError("Authentication is not configured.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await signInWithPopup(auth, provider);
      const token = await user.getIdToken();
      await syncSessionAction(token);
      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (configured === null) {
    return <SignInFallback />;
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
          <CardDescription>
            Firebase is not configured. Set the variables in <code>.env</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
            Back to home
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
        <CardDescription>
          {isSignUp ? "Already have an account? " : "New here? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
            }}
            className="text-neutral-900 underline hover:no-underline dark:text-neutral-100"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "Create a password" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
          </Button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-sm text-neutral-500">or continue with</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn(new GoogleAuthProvider())}
            disabled={loading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}
