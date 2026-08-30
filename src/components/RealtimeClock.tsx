"use client";

/**
 * Real-time clock (V3.3).
 *
 * Renders the current Indonesian time and updates on a 1-second
 * interval. The displayed time is the live `Date.now()` rendered
 * in Asia/Jakarta timezone, using the browser's
 * `Intl.DateTimeFormat` — no AI, no API, no hardcoded value.
 *
 * SSR-safe: the initial render shows the time frozen at the
 * server's now() so server and client agree on first paint
 * (no hydration mismatch). The client then takes over and ticks
 * the displayed time once per second.
 */
import { useEffect, useState } from "react";

import styles from "./RealtimeClock.module.css";

const TIMEZONE = "Asia/Jakarta";

/**
 * Format a Date as Indonesian time in Asia/Jakarta.
 *
 * The default formatting uses 24-hour time and a short date, e.g.
 * "Rabu, 09 Agu 2026 · 14.35 WIB". We use this both server- and
 * client-side so the values match across the hydration boundary.
 */
function formatID(date: Date): string {
  try {
    const datePart = new Intl.DateTimeFormat("id-ID", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("id-ID", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${datePart} · ${timePart} WIB`;
  } catch {
    // Intl unavailable (very old browser / test env). Fall back
    // to the raw Date — better than nothing.
    return date.toString();
  }
}

function formatTimeOnly(date: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "";
  }
}

export function RealtimeClock({
  variant = "full",
}: {
  variant?: "full" | "time";
}) {
  // We start with `null` so the server and the client agree on
  // first render. We then update on the client only. This avoids
  // hydration mismatches without freezing the displayed value.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Set once on mount, then tick every second.
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Until the client has hydrated, render a subtle placeholder
  // (a thin non-breaking space) so the footer doesn't shift.
  if (!now) {
    return (
      <span className={styles.clock} suppressHydrationWarning>
        &nbsp;
      </span>
    );
  }

  if (variant === "time") {
    return (
      <time
        className={styles.clock}
        dateTime={now.toISOString()}
        suppressHydrationWarning
      >
        {formatTimeOnly(now)}
      </time>
    );
  }

  return (
    <time
      className={styles.clock}
      dateTime={now.toISOString()}
      suppressHydrationWarning
    >
      {formatID(now)}
    </time>
  );
}
