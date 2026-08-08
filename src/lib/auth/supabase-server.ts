/**
 * Server-side Supabase client that reads/writes the user's session
 * via Next.js cookies. Used for:
 *   - Verifying that a request belongs to an authenticated user.
 *   - Calling Supabase Auth OTP endpoints.
 *
 * IMPORTANT: this client uses the publishable (anon) key, not the
 * service role key. It can only do what RLS allows. The admin-side
 * reads of the aspirations table happen via the service role
 * (`getSupabaseAdmin()`), which is a separate, server-only client.
 */
import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getSupabaseAdmin } from "@/lib/db/client";

export const OSAMA_SESSION_COOKIE = "osama-session";

/**
 * Build a Supabase client bound to the current request's cookies.
 * Use this in route handlers and server components.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase publishable env vars are not configured.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Read-only contexts (e.g. some server components) cannot
          // set cookies. We swallow because the OTP verify path
          // handles cookie writes itself.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // same as above
        }
      },
    },
  });
}

/**
 * Returns the currently authenticated user (if any) for the request,
 * or null. Does NOT enforce the allowlist — that's done separately
 * by `assertOsamaAccess()`. A user could theoretically have a
 * Supabase session but not be on the OSAMA allowlist.
 */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The strict access check for protected OSAMA routes. Returns the
 * user object only if BOTH the Supabase session is valid AND the
 * email is on the allowlist. Otherwise null.
 */
export async function assertOsamaAccess() {
  const user = await getCurrentUser();
  if (!user || !user.email) return null;

  // Lazy import to keep the allowlist module server-only and avoid
  // a circular dep.
  const { isAllowedEmail } = await import("./allowlist");
  if (!isAllowedEmail(user.email)) return null;
  return user;
}

/**
 * Convenience for the admin side: the service-role Supabase client
 * (bypasses RLS). Always re-exports from the db layer for symmetry.
 */
export { getSupabaseAdmin };
