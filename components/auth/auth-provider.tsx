"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { onIdTokenChanged } from "firebase/auth";

import { signOutAction, syncSessionAction } from "@/lib/auth/actions";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUidRef = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await auth.signOut();
    await signOutAction();
    queryClient.clear();
    previousUidRef.current = null;
    setUser(null);
    router.push("/");
  }, [router, queryClient]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (!mounted) return;

      const newUid = fbUser?.uid ?? null;
      const previousUid = previousUidRef.current;
      if (newUid !== previousUid) {
        previousUidRef.current = newUid;
        queryClient.clear();
      }

      setUser(fbUser);

      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          await syncSessionAction(token);
        } catch {
          console.error("Sync failed; cookie may be stale.");
          // Sync failed; cookie may be stale.
        }
      } else {
        await signOutAction();
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
