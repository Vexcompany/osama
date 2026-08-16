"use client";

/**
 * RecentListClient — searchable, filterable list of recent
 * aspirations. Rows are fetched server-side; this component only
 * filters them client-side so interactions feel instant.
 */
import { useMemo, useState } from "react";
import Link from "next/link";

import type { AspirationStatus } from "@/lib/db/admin";
import styles from "./dashboard.module.css";

export interface RecentRow {
  caseId: string;
  topic: string;
  message: string;
  status: AspirationStatus;
  createdAt: string;
}

const FILTERS: { key: "all" | AspirationStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "new", label: "Baru" },
  { key: "processing", label: "Diproses" },
  { key: "resolved", label: "Selesai" },
  { key: "archived", label: "Arsip" },
];

function statusLabel(s: string): string {
  switch (s) {
    case "new":
      return "Baru";
    case "processing":
      return "Diproses";
    case "resolved":
      return "Selesai";
    case "archived":
      return "Arsip";
    default:
      return s;
  }
}

function statusClass(s: string): string {
  switch (s) {
    case "new":
      return styles.statusNew;
    case "processing":
      return styles.statusProcessing;
    case "resolved":
      return styles.statusResolved;
    case "archived":
      return styles.statusArchived;
    default:
      return "";
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function RecentListClient({ rows }: { rows: RecentRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AspirationStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.caseId.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const hasAny = rows.length > 0;

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="sr-only">Cari aspirasi</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Cari Case ID atau isi pesan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className={styles.filterGroup} role="group" aria-label="Filter status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={styles.filterChip}
              data-active={filter === f.key ? "true" : undefined}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path d="M4 6 H20 M4 12 H14 M4 18 H10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M18 16 L18 21 M15.5 18.5 L20.5 18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>Belum ada aspirasi</h3>
          <p className={styles.emptyDesc}>
            Aspirasi yang dikirim melalui halaman publik akan muncul di sini.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg viewBox="0 0 20 20" width="22" height="22" fill="none">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>Tidak ada hasil</h3>
          <p className={styles.emptyDesc}>
            Tidak ada aspirasi yang cocok dengan pencarian atau filter ini.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.rowList}>
            {filtered.map((row) => (
              <Link
                key={row.caseId}
                href={`/osama/dashboard/${encodeURIComponent(row.caseId)}`}
                className={styles.row}
              >
                <span className={styles.caseIdCell}>{row.caseId}</span>
                <span className={styles.msgCell}>{row.message}</span>
                <span className={`${styles.statusPill} ${statusClass(row.status)}`}>
                  {statusLabel(row.status)}
                </span>
                <time
                  className={styles.timeCell}
                  dateTime={row.createdAt}
                  title={row.createdAt}
                >
                  {formatTime(row.createdAt)}
                </time>
                <span className={styles.chevronCell} aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
                    <path d="M8 5 L13 10 L8 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          <div className={styles.mobileList}>
            {filtered.map((row) => (
              <Link
                key={row.caseId}
                href={`/osama/dashboard/${encodeURIComponent(row.caseId)}`}
                className={styles.mobileRow}
              >
                <div className={styles.mobileTop}>
                  <span className={styles.caseIdCell}>{row.caseId}</span>
                  <span className={`${styles.statusPill} ${statusClass(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                </div>
                <p className={styles.mobileSnippet}>{row.message}</p>
                <div className={styles.mobileMeta}>
                  <time
                    className={styles.timeCell}
                    dateTime={row.createdAt}
                    title={row.createdAt}
                  >
                    {formatTime(row.createdAt)}
                  </time>
                  <span className={styles.chevronCell} aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                      <path d="M8 5 L13 10 L8 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
