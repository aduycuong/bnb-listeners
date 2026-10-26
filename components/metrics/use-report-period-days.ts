"use client";

import { useCallback, useSyncExternalStore } from "react";

import { METRICS_CONFIG } from "@/lib/metrics/config";

export type ReportPeriodDays = (typeof METRICS_CONFIG.reportPeriodDays)[number];

const STORAGE_KEY = "bnb.reportPeriodDays";
const CHANGE_EVENT = "bnb:report-period-days";

/** Last pick of this tab, for browsers that block storage. */
let pickedDays: ReportPeriodDays | null = null;

function isReportPeriodDays(value: number): value is ReportPeriodDays {
  return (METRICS_CONFIG.reportPeriodDays as readonly number[]).includes(value);
}

function readStoredDays(): ReportPeriodDays {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (isReportPeriodDays(stored)) return stored;
  } catch {
    // Storage blocked: fall back to this tab's pick.
  }
  return pickedDays ?? METRICS_CONFIG.defaultReportPeriodDays;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Period of the report pages; the last pick is kept in the browser and shared by every report. */
export function useReportPeriodDays(): [ReportPeriodDays, (days: number) => void] {
  const days = useSyncExternalStore(
    subscribe,
    readStoredDays,
    () => METRICS_CONFIG.defaultReportPeriodDays,
  );
  const setDays = useCallback((next: number) => {
    if (!isReportPeriodDays(next)) return;
    pickedDays = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Storage blocked: `pickedDays` keeps the pick until the page reloads.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [days, setDays];
}
