"use client";

import { useSyncExternalStore } from "react";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
};

function subscribe() {
  return () => {};
}

function formatIso(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString(undefined, {
    ...DATE_TIME_OPTIONS,
    ...(timeZone ? { timeZone } : {}),
  });
}

function toIso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

/** Formats a timestamp in the viewer's local timezone after hydration. */
export function LocalDateTime({ value }: { value: Date | string }) {
  const iso = toIso(value);
  const label = useSyncExternalStore(
    subscribe,
    () => formatIso(iso),
    () => formatIso(iso, "UTC"),
  );

  return <time dateTime={iso}>{label}</time>;
}
