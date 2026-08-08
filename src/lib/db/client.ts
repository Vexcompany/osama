/**
 * Supabase client factory.
 *
 * The public form uses the service role key on the server so we can
 * bypass RLS for inserts (we validate every payload at the API layer).
 * The anon key is required as `NEXT_PUBLIC_SUPABASE_URL` so we can
 * also reach the project from client code if V2 needs realtime.
 *
 * NEVER import the service role key in a file that is bundled to the
 * client. The `import "server-only"` guard below ensures that.
 */
import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
