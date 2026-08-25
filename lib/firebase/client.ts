"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

function getApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const apps = getApps();
  if (apps.length) return apps[0] as FirebaseApp;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  return initializeApp(firebaseConfig);
}

export function getFirebaseApp(): FirebaseApp | null {
  return getApp();
}

export function getFirebaseAuth(): Auth | null {
  const app = getApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDatabase(): Database | null {
  const app = getApp();
  if (!app || !firebaseConfig.databaseURL) {
    return null;
  }
  return getDatabase(app);
}

export function isFirebaseConfigured(): boolean {
  return !!(
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function isFirebaseRtdbConfigured(): boolean {
  return !!(
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim()
  );
}
