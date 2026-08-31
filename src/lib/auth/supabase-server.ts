/** Server-side Supabase auth client for OSAMA. */
import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/db/client';

export const OSAMA_SESSION_COOKIE = 'osama-session';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase publishable env vars are not configured.');

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: '', ...options }); } catch {}
      },
    },
  });
}

export const createServerSupabaseClient = getServerSupabase;

export async function getCurrentUser() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    // Missing/misconfigured preview auth must not turn the public OSAMA
    // login page into a 500 response. Protected routes will still deny access.
    return null;
  }
}

export async function assertOsamaAccess() {
  const user = await getCurrentUser();
  if (!user?.email) return null;
  const { isAllowedEmail } = await import('./allowlist');
  return isAllowedEmail(user.email) ? user : null;
}

export { getSupabaseAdmin };
