# OSIS Ngobrol Yuk — V1

Halaman publik pengiriman aspirasi OSIS. UX ringkas ala NGL dengan
identitas visual underwater yang premium.

> **V1 hanya**: form publik + submit + success state + internal Case ID.
> OSAMA Panel dan OTP akan dibangun di V2 tanpa merombak fondasi ini.

## Stack

- **Next.js 14** (App Router, server actions + route handlers)
- **React 18**
- **TypeScript** strict
- **Supabase** (Postgres) — server-only via service role key
- **Zod** — validasi tunggal untuk client & server
- **CSS Modules + satu Canvas** untuk visual underwater (no animation libs)

## Struktur

```
src/
  app/
    api/
      aspirations/route.ts   # POST endpoint (server-side validation + insert)
      health/route.ts        # GET liveness probe
    layout.tsx
    not-found.tsx            # On-brand 404
    page.tsx                 # Public form page
    globals.css
    page.module.css
  components/
    aspiration/
      AspirationForm.tsx     # Form + state machine
      AutoGrowTextarea.tsx   # Textarea with measured growth
      SuccessState.tsx       # Success animation
    underwater/
      UnderwaterBackground.tsx  # Single canvas, one rAF loop
  lib/
    db/
      client.ts              # Supabase admin client (server-only)
      aspirations.ts         # Repository
    validation/
      aspiration.ts          # Zod schemas + FieldErrors
    case-id.ts               # Internal case id generator
    rate-limit.ts            # In-memory IP rate limiter
  middleware.ts              # Security headers
supabase/
  schema.sql                 # Paste into Supabase SQL editor
```

## Setup

1. Install deps:
   ```bash
   npm install
   ```

2. Siapkan Supabase: buat project baru di https://app.supabase.com,
   lalu buka **SQL Editor → New query** dan paste isi
   [`supabase/schema.sql`](./supabase/schema.sql). Jalankan sekali.

3. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
   (Project Settings → API).

4. Jalankan:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

## Environment variables

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ya | URL project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Service role key (server only, JANGAN expose) |
| `NEXT_PUBLIC_HONEYPOT_FIELD_NAME` | tidak | Nama field honeypot (default `website_url`) |
| `RATE_LIMIT_WINDOW_SECONDS` | tidak | Window rate limit (default `60`) |
| `RATE_LIMIT_MAX` | tidak | Maks submit per IP per window (default `3`) |

## Endpoint

### `POST /api/aspirations`

Request:
```json
{
  "topic": "Ringkas topik aspirasimu...",
  "message": "Ceritakan saran, kritik, atau aspirasimu...",
  "anonymous": true,
  "website_url": ""  // honeypot, biarkan kosong
}
```

Response sukses (201):
```json
{ "ok": true }
```

> **Catatan penting**: response **tidak** mengandung `caseId`. Case ID
> hanya digunakan internal oleh panel OSIS (V2).

Response error:
- `400` body tidak valid / spam (honeypot) → `{ ok: false, error: {...} }`
- `429` rate limited → `{ ok: false, error: { kind: "rate_limited", retryAfterSeconds: N } }`
- `500` server error

## Kontrak data

Tabel `public.aspirations`:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `bigserial` PK | internal |
| `case_id` | `text` UNIQUE | internal, format `ONY-XXXX-YYYY` |
| `topic` | `text` | 1..80 char |
| `message` | `text` | 1..500 char |
| `anonymous` | `boolean` | default `true` |
| `status` | `text` | `new` / `reviewed` / `in_progress` / `done` / `archived` |
| `created_at` | `timestamptz` | default `now()` |

## Yang TIDAK ada di V1

- Autentikasi publik
- OSAMA Panel / dashboard admin
- OTP (akan datang di V2)
- Notifikasi email / WA
- Lampiran file
- Bot "Kak Taksaka"

Fondasi sengaja dipisah modular (UI / form logic / API / validation /
database / visual system) supaya V2 bisa menambah layer di atas tanpa
refactor besar.

## Definition of Done (V1)

Lihat brief section 14. Singkatnya: buka website → form langsung
terlihat → submit → success state → bisa kirim lagi. Case ID
disimpan di DB tapi **tidak** ditampilkan ke user. Tidak ada glitch
layout / jumping / textarea absurdly tall.
