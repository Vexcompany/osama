"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OsamaCanvas } from "@/components/osama/OsamaCanvas";
import styles from "./case.module.css";

interface Props {
  caseId: string;
  message: string;
  initialAdminReply?: string | null;
}

export function AdminReplySection({
  caseId,
  message,
  initialAdminReply = "",
}: Props) {
  const router = useRouter();
  const [reply, setReply] = useState(initialAdminReply ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(
        `/api/osama/cases/${encodeURIComponent(caseId)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminReply: reply }),
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Gagal menyimpan balasan.");
        return;
      }

      setSaved(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.replySection}>
      <div className={styles.replyBlock}>
        <label className={styles.label} htmlFor="admin-reply-input">
          Balasan Admin (Area Dekat Kura-kura)
        </label>
        <textarea
          id="admin-reply-input"
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
            setSaved(false);
          }}
          placeholder="Tulis balasan resmi OSIS / PAGASKA di sini..."
          className={styles.replyTextarea}
          rows={3}
        />
        <div className={styles.replyControls}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={styles.saveReplyBtn}
          >
            {saving ? "Menyimpan…" : "💾 Simpan Balasan Admin"}
          </button>
          {saved && (
            <span className={styles.savedNotice}>✓ Balasan tersimpan!</span>
          )}
          {error && <span className={styles.errorNotice}>{error}</span>}
        </div>
      </div>

      <OsamaCanvas caseId={caseId} message={message} adminReply={reply} />
    </div>
  );
}
