import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";

let adminApp: App | null = null;

function getOrCreateApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0] as App;
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) return null;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp({ projectId });
    return adminApp;
  }

  if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      databaseURL:
        process.env.FIREBASE_DATABASE_URL ||
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    return adminApp;
  }

  return null;
}

export function getAdminAuth(): Auth | null {
  const app = getOrCreateApp();
  return app ? getAuth(app) : null;
}

export function getAdminDatabase(): Database | null {
  const app = getOrCreateApp();
  return app ? getDatabase(app) : null;
}
