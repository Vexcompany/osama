'use client';

import { useState, useTransition } from 'react';

interface Props {
  caseId: string;
  currentStatus: string;
}

const TRANSITIONS: Record<string, string[]> = {
  new: ['processing', 'archived'],
  processing: ['resolved', 'archived'],
  resolved: ['archived'],
  archived: [],
};

const ACTION_LABELS: Record<string, string> = {
  processing: 'Tandai Diproses',
  resolved: 'Tandai Ditanggapi',
  archived: 'Arsipkan',
};

export default function CaseActions({ caseId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const available = TRANSITIONS[status] ?? [];
  if (available.length === 0) return null;

  async function handleUpdate(newStatus: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/osama/cases/${caseId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Gagal memperbarui status.');
          return;
        }
        setStatus(newStatus);
      } catch {
        setError('Terjadi kesalahan jaringan.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Ubah status:</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {available.map(next => (
          <button
            key={next}
            onClick={() => handleUpdate(next)}
            disabled={isPending}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-card)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
              transition: 'var(--transition)',
              fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--glow-cyan)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
            aria-label={ACTION_LABELS[next] ?? next}
          >
            {isPending ? '…' : (ACTION_LABELS[next] ?? next)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{error}</p>
      )}
    </div>
  );
}
