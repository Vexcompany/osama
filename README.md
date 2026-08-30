# OSIS Ngobrol Yuk

Aplikasi web OSIS untuk pengiriman aspirasi publik (V1) dan panel
internal OSAMA (V2).

```
V1  — Public aspiration form + submit + Case ID  ✅
V2  — Authentication + OSAMA Panel + security    ✅
V3  — Kak Taksaka + personality + onboarding     (next)
V4  — Full UI/UX redesign + premium visuals     (next, with Claude)
```

> Setiap versi ditambahkan di atas fondasi versi sebelumnya. V1 tidak
> diubah oleh V2 selain penyesuaian yang memang diperlukan untuk
> integrasi (mis. `updated_at` di schema, status vocabulary, dsb.).

## Stack

- **Next.js 14** App Router (TypeScript strict)
- **React 18**
- **Supabase** — Postgres untuk data, Supabase Auth untuk OTP session
- **@supabase/ssr** — session management di Next.js
- **Zod** — validasi client & server (satu schema)
- **CSS Modules** + 1 canvas — visual underwater (V1)

## Struktur

```
src/
  app/
    page.tsx                       # V1 public form
    osama/
      page.tsx                     # V2 — login (email)
      verify/page.tsx              # V2 — OTP entry
      dashboard/
        layout.tsx                 # V2 — auth gate (server-side)
        page.tsx                   # V2 — overview
        [caseId]/page.tsx          # V2 — case detail
        [caseId]/CaseActions.tsx   # V2 — status mutation
        LogoutButton.tsx
      LoginForm.tsx
      verify/VerifyForm.tsx
    api/
      aspirations/route.ts         # V1 — POST submit
      osama/
        request-otp/route.ts       # V2 — step 1 (allowlist + signInWithOtp)
        verify-otp/route.ts        # V2 — step 2 (verifyOtp)
        logout/route.ts            # V2 — signOut
        cases/[caseId]/status/route.ts  # V2 — status update
  components/
    aspiration/                    # V1 form UI
    underwater/                    # V1 visual
  lib/
    auth/
      allowlist.ts                 # V2 — server-only email allowlist
      supabase-server.ts           # V2 — session-bound Supabase client
    case-id.ts                     # OSM-XXXX-XXXX generator
    rate-limit.ts                  # in-memory IP limiter
    db/
      client.ts                    # Supabase admin (server-only)
      aspirations.ts               # V1 repo
      admin.ts                     # V2 repo (counts, list, status)
    validation/aspiration.ts       # V1 zod
  middleware.ts                    # security headers
supabase/
  schema.sql                       # V1 — initial table
  schema-v2.sql                    # V2 — status vocab, updated_at, RLS lock-down
```

## Setup

1. Install deps:
   ```bash
   npm install
   ```

2. Siapkan Supabase:
   - Buat project baru di https://app.supabase.com.
   - Buka **SQL Editor → New query**, paste isi
     [`supabase/schema.sql`](./supabase/schema.sql), jalankan.
   - Buka query baru lagi, paste
     [`supabase/schema-v2.sql`](./supabase/schema-v2.sql), jalankan.
     Migration ini mengubah CHECK constraint status, menambah kolom
     `updated_at`, dan mengunci RLS agar anon key tidak punya akses
     baca/tulis ke tabel.
   - Aktifkan **Email OTP** di
     `Authentication → Providers → Email` (enable Email, matikan
     "Confirm email" jika tidak perlu — OTP-only sudah cukup).
   - Buat 2 user di `Authentication → Users → Add user` dengan email:
       - email OSAMA resmi
       - email PAGASKA resmi
     (User dibuat di sini, lalu diizinkan lewat env var
     `OSAMA_ALLOWED_EMAILS`. Tidak ada self-registration.)

3. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Isi semua variabel. Yang **wajib** untuk V2:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable, boleh public)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, JANGAN expose)
   - `OSAMA_ALLOWED_EMAILS` — **hanya 2 email**, dipisah koma. Contoh:
     `osama@osis.example,pagaska@osis.example`

4. Jalankan:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

## Environment variables

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ya | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | Anon key (publishable, sesuai arsitektur Supabase) |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Service role (server only, JANGAN expose) |
| `OSAMA_ALLOWED_EMAILS` | ya (V2) | 2 email OSAMA/PAGASKA, dipisah koma |
| `NEXT_PUBLIC_HONEYPOT_FIELD_NAME` | tidak | Default `website_url` |
| `RATE_LIMIT_WINDOW_SECONDS` | tidak | Default `60` |
| `RATE_LIMIT_MAX` | tidak | Default `3` |

## Endpoint V1

### `POST /api/aspirations`

Request:
```json
{ "message": "Tulis pesanmu di sini...", "website_url": "" }
```

Response sukses (201):
```json
{ "ok": true, "caseId": "OSM-XXXXXXXX-XXXXXX" }
```

## Endpoint V2

### `POST /api/osama/request-otp`

Request: `{ "email": "..." }`

- Email tidak ada di allowlist → `403`
  `Email tidak memiliki akses ke panel OSAMA.`
  (Supabase **tidak** dipanggil — tidak ada OTP terkirim, tidak ada
  info apakah email tersebut ada di Supabase Auth.)
- Email ada di allowlist → `signInWithOtp` ke Supabase dengan
  `shouldCreateUser: false`. Response generik.

### `POST /api/osama/verify-otp`

Request: `{ "email": "...", "code": "123456" }`

- Code valid + email di allowlist → set session cookie, return `200`.
- Code valid tapi email TIDAK di allowlist → signOut paksa, return
  generic error.
- Code tidak valid / expired → generic `Kode verifikasi tidak valid.`
- Supabase sendiri yang handle expiration, attempt limit, dan rate
  limit OTP.

### `POST /api/osama/logout`

Selalu return `200`, signOut Supabase. Idempotent.

### `POST /api/osama/cases/[caseId]/status`

Request: `{ "status": "processing" | "resolved" | "archived" }`

- Tidak auth → `401`.
- Case ID tidak ditemukan → `404`.
- Transisi tidak valid (mis. `new → resolved`) → `409`.
- Sukses → `200`.

## Keamanan V2 (ringkasan)

| Aspek | Mekanisme |
| --- | --- |
| Email allowlist | Server-only env var; dicek **sebelum** Supabase dipanggil |
| OTP | Supabase Auth (`signInWithOtp` + `verifyOtp`) — bukan custom |
| OTP expiration | Dikelola Supabase |
| OTP attempt limit | Dikelola Supabase |
| Rate limit | In-memory per IP, key terpisah untuk request-otp vs verify-otp |
| Session | HttpOnly cookies via `@supabase/ssr` |
| Server-only secrets | `import "server-only"` di semua file yang menyentuh secret |
| RLS | Enabled, **tidak ada policy untuk anon/authenticated** — service role bypass; publishable key ditolak |
| Generic errors | Allowlist rejection & invalid OTP punya response yang identik |
| Logout | `signOut` + `router.replace` + `router.refresh` — back button tidak restore session karena server check di layout |
| Network tab safety | Tidak ada secret, allowlist, atau OTP yang pernah dikirim ke client; request ke Supabase adalah hal normal |

## Kontrak data

Tabel `public.aspirations` (V2):

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `bigserial` PK | internal |
| `case_id` | `text` UNIQUE | format `OSM-XXXX-YYYY` (prefix WAJIB konsisten di semua UI & panel) |
| `topic` | `text` | 1..80 char — di-derive server dari baris pertama pesan |
| `message` | `text` | 1..500 char |
| `anonymous` | `boolean` | selalu `true` di V1 (no toggle) |
| `status` | `text` | `new` / `processing` / `resolved` / `archived` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | auto-updated via trigger (V2) |

Transisi status yang diizinkan:
```
new → processing
new → archived
processing → resolved
processing → archived
resolved → archived
```

## Definition of Done — V2

1. ✅ `/osama` tersedia, login via email + OTP
2. ✅ Tidak ada public registration / sign up
3. ✅ Hanya 2 akun (allowlist via `OSAMA_ALLOWED_EMAILS`)
4. ✅ Email random ditolak sebelum Supabase dipanggil
5. ✅ OTP via Supabase Auth (expiration, attempts, rate limit)
6. ✅ Session cookie setelah OTP valid
7. ✅ `/osama/dashboard/*` di-gate oleh server layout (bukan UI)
8. ✅ Case ID prefix `OSM` (sudah dari V1 revisi)
9. ✅ Status: `new → processing → resolved (+ archived)`
10. ✅ Logout menghapus session & bounce ke `/osama`
11. ✅ RLS enabled, no policy untuk anon/authenticated
12. ✅ Service role key & allowlist tidak pernah muncul di client bundle
13. ✅ V1 public form tetap berfungsi tanpa perubahan
14. ✅ Tidak ada V3/V4 (Kak Taksaka, redesign)
