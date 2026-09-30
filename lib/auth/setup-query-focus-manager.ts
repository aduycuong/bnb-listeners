"use client";

import { focusManager } from "@tanstack/react-query";

import {
  isSyncedSessionValid,
  waitForSyncedSessionUpdate,
} from "@/lib/auth/synced-session-client";

async function gatedHandleFocus(handleFocus: () => void): Promise<void> {
  if (isSyncedSessionValid()) {
    handleFocus();
    return;
  }

  await waitForSyncedSessionUpdate();

  if (isSyncedSessionValid()) {
    handleFocus();
  }
}

export function setupAuthGatedQueryFocusManager(): void {
  focusManager.setEventListener((handleFocus) => {
    const onWindowFocus = () => {
      if (document.visibilityState === "visible") {
        void gatedHandleFocus(handleFocus);
      } else {
        handleFocus();
      }
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("visibilitychange", onWindowFocus, false);
      window.addEventListener("focus", onWindowFocus, false);
    }

    return () => {
      window.removeEventListener("visibilitychange", onWindowFocus);
      window.removeEventListener("focus", onWindowFocus);
    };
  });
}
