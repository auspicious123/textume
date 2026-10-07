# BusyTeX: local vs R2 (env only)

Configure via `.env` / Vercel project env. No in-app settings.

```bash
# Local machine (files in public/core/busytex after npm run latex:assets)
NEXT_PUBLIC_BUSYTEX_SOURCE=local

# Production on Vercel
NEXT_PUBLIC_BUSYTEX_SOURCE=r2
NEXT_PUBLIC_BUSYTEX_BASE_URL=https://pub-xxxxxxxx.r2.dev/busytex
```

Also set GitHub OAuth on the server/env only:

```bash
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...   # server-only, never NEXT_PUBLIC_
```

`NEXT_PUBLIC_*` values are baked in at **build** time — change them in Vercel, then redeploy.

---

## Can I push BusyTeX to GitHub and still use R2?

**Short answer: don’t push the big BusyTeX blobs. Use R2 for production.**

| What | Push to GitHub? | Why |
|---|---|---|
| App source (Next.js) | Yes | Normal |
| BusyTeX `.js` helpers (small) | Optional | Already partly tracked |
| BusyTeX `.data` / `.wasm` (~600MB+) | **No** | Gitignored; GitHub **rejects files &gt; 100MB** (`texlive-extra.data` ≈ 326MB) |
| R2 bucket with full busytex | Yes (upload separately) | What Vercel users download |

If `NEXT_PUBLIC_BUSYTEX_SOURCE=r2`, the browser loads assets from R2. Files under `public/core/busytex` on Vercel are **ignored** for compile. Having them in the deploy anyway only wastes upload size — and Hobby often can’t fit them.

**Recommended flow**

1. Keep large files gitignored (already in `.gitignore`).
2. Locally: `npm run latex:assets` + `SOURCE=local`.
3. Upload that folder to R2 (below).
4. Vercel: `SOURCE=r2` + `BUSYTEX_BASE_URL` + GitHub env vars.
5. Push **code only** to GitHub → deploy.

Using R2 while also forcing BusyTeX into the repo does **not** help and usually **fails** (GitHub file size / Vercel deploy size).

---

## 1. Prepare local assets

```bash
npm run latex:assets
```

Fills `public/core/busytex/` (~600MB+).

## 2. Upload to Cloudflare R2

1. Create bucket (e.g. `textume-busytex`).
2. Enable public access / custom domain.
3. Upload files under prefix `busytex/`.

### Dashboard limit (what you hit)

The R2 **web UI cannot upload files over 300MB**.  
`texlive-extra.data` is ~**326MB**, so the folder upload fails with:

> exceeds the 300 MB limit. Use the S3 Compatibility API or Workers…

Upload smaller files in the dashboard if you want, but **always upload `texlive-extra.data` via CLI**.

### Recommended: upload script (from this repo)

**Limits:** Dashboard and Wrangler both reject files **> 300 MiB**.  
`texlive-extra.data` (~326 MiB) needs the **R2 S3 API** (multipart). The script uses Wrangler for smaller files and S3 multipart for the large one.

```bash
# 1) Copy env template and fill R2_* (upload-only; not needed on Vercel)
cp .env.example .env
#    R2_BUCKET=textume-busytex
#    R2_PREFIX=busytex
#    R2_ACCOUNT_ID=…          # R2 → Overview
#    R2_ACCESS_KEY_ID=…       # R2 → Manage R2 API Tokens
#    R2_SECRET_ACCESS_KEY=…

# 2) Wrangler login (same Cloudflare account as the bucket)
npx wrangler login
npx wrangler r2 bucket list
# If missing: npx wrangler r2 bucket create textume-busytex

# 3) Assets + upload (script loads .env automatically)
npm run latex:assets
npm run busytex:upload-r2
```

Safe to re-run; it overwrites keys. Remaining files after a mid-run failure (e.g. past `texlive-extra`) will upload on the next run.

**“The specified bucket does not exist”** → wrong Cloudflare account; use `whoami` / `bucket list` / `CLOUDFLARE_ACCOUNT_ID`.

Public base URL example:

```text
https://pub-xxxxxxxx.r2.dev/busytex
```

`https://…/busytex/texlive-basic.js` must open in a browser (HTTP 200).  
Also confirm `…/busytex/texlive-extra.data` is present.

## 3. CORS (required for R2 mode)

Browsers **cannot** create a Web Worker from an R2 URL (`Failed to construct 'Worker'… cannot be accessed from origin…`).  
Textume serves the small worker bootstrap from your app (`/api/busytex-bootstrap/*`) and loads `.wasm` / `.data` from R2. Those R2 fetches need CORS:

```json
[
  {
    "AllowedOrigins": ["https://your-app.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

Cloudflare → R2 → your bucket → **Settings** → **CORS policy**.

Also: `.js` objects must be served as `text/javascript` (not `application/octet-stream`), or `importScripts` fails.  
`npm run busytex:upload-r2` sets Content-Type automatically — re-upload after pulling that fix if you uploaded earlier without it.

## 4. Vercel env

```bash
NEXT_PUBLIC_BUSYTEX_SOURCE=r2
NEXT_PUBLIC_BUSYTEX_BASE_URL=https://pub-xxxxxxxx.r2.dev/busytex
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Redeploy after changing `NEXT_PUBLIC_*`.

## Backblaze B2

Same pattern: upload folder, public URL, CORS, set `NEXT_PUBLIC_BUSYTEX_BASE_URL`.
