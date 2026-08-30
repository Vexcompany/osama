/**
 * OSAMA layout.
 *
 * The login pages (`/osama`, `/osama/verify`) are accessible without
 * authentication. The dashboard pages live under a nested layout
 * that does the real auth check.
 *
 * This top-level layout just provides consistent chrome around the
 * login flow and ensures we always have access to the Supabase
 * session helpers via cookies.
 */
import { UnderwaterBackground } from "@/components/underwater/UnderwaterBackground";

import styles from "./osama.module.css";

export const dynamic = "force-dynamic";

export default function OsamaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <UnderwaterBackground intensity={0.6} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
