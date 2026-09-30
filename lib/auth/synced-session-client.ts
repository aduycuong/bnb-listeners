import { createEventEmitter } from "@/lib/common/create-event-emitter";
import { isTokenNotExpired } from "@/lib/auth/token";

type SyncedSessionEvents = {
  change: undefined;
};

const sessionEvents = createEventEmitter<SyncedSessionEvents>();

let syncedToken: string | null = null;
let syncGeneration = 0;

function notifyChange(): void {
  syncGeneration += 1;
  sessionEvents.emit("change");
}

export function getSyncedToken(): string | null {
  return syncedToken;
}

export function isSyncedSessionValid(): boolean {
  return syncedToken !== null && isTokenNotExpired(syncedToken);
}

export function setSyncedToken(
  token: string | null,
  options?: { silent?: boolean },
): void {
  syncedToken = token;
  if (!options?.silent) {
    notifyChange();
  }
}

export function subscribeSyncedSession(listener: () => void): () => void {
  sessionEvents.on("change", listener);
  return () => {
    sessionEvents.off("change", listener);
  };
}

export function waitForSyncedSessionUpdate(): Promise<void> {
  if (isSyncedSessionValid()) {
    return Promise.resolve();
  }

  const startGeneration = syncGeneration;

  return new Promise((resolve) => {
    const onChange = () => {
      if (
        syncGeneration !== startGeneration ||
        isSyncedSessionValid()
      ) {
        sessionEvents.off("change", onChange);
        resolve();
      }
    };

    sessionEvents.on("change", onChange);
    onChange();
  });
}
