"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import type { Auth } from "firebase/auth";

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
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function ForgotPasswordFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading…</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ForgotPasswordForm() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuth(getFirebaseAuth());
    setConfigured(isFirebaseConfigured());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!auth) {
      setError("Authentication is not configured.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (configured === null) {
    return <ForgotPasswordFallback />;
  }

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Firebase is not configured.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-900">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a password reset link to {email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-900">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email and we will send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          <Link href="/sign-in" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
