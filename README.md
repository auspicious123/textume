# Textume

Browser-based LaTeX resume manager. Edit `.tex` resumes, compile them to PDF in the browser, and optionally sync with a GitHub repository.

**Core LaTeX compilation runs locally in your browser.** Source is not sent to a Textume compile server. There is no app database and no required backend for local resumes.

## Why it exists

Most resume workflows are either Word/Google Docs (weak for LaTeX) or full Overleaf-style projects (heavy for a single resume). Textume is a small, open-source alternative focused on resumes: local-first storage, optional GitHub, and in-browser PdfTeX.

## Features

- Create, rename, duplicate, and delete **local** resumes (localStorage)
- Import a local `.tex` file
- CodeMirror editor with LaTeX highlighting
- In-browser compile + PDF preview (BusyTeX WASM)
- Auto-compile toggle (debounced)
- Built-in templates (`modern`, `classic`, `minimal`)
- Optional **GitHub** sync using a simple `/resumes` convention
- Explicit GitHub save (commit message; no auto-commit on keystrokes)

## Architecture

```text
User Browser
    |
    +-- Next.js
    |
    +-- CodeMirror
    |
    +-- WASM LaTeX Engine
    |
    +-- Local Storage
    |
    +-- GitHub API
    |
    +-- PDF Preview
```

| Piece | Role |
| --- | --- |
| Next.js App Router | UI shell; tiny OAuth proxy routes only |
| CodeMirror 6 | `.tex` editing |
| BusyTeX (WASM) | PdfTeX compile in a worker |
| localStorage | Local resume CRUD |
| GitHub API | Optional remote `/resumes/*.tex` |
| Blob URL PDF preview | Show compile output |

Important paths:

- `src/lib/latex/compiler.ts` — compile API used by the UI
- `src/lib/resume-storage.ts` — local resumes
- `src/lib/github/` — auth, repos, files, `/resumes` convention
- `templates/*/main.tex` — template sources (synced into the app)

## Browser-side LaTeX compilation

Compilation uses [BusyTeX](https://www.npmjs.com/package/texlyre-busytex) in a Web Worker. The browser loads Wasm + TeX Live packages, runs PdfTeX, and returns PDF bytes (no Textume compile server).

**BusyTeX is not in the Git repo.** Large `.data` / `.wasm` files are gitignored (and too big for GitHub). After clone you must download them (or point at R2).

| `NEXT_PUBLIC_BUSYTEX_SOURCE` | Assets come from |
| --- | --- |
| `local` (default) | `/core/busytex` → `public/core/busytex/` after `npm run latex:assets` |
| `r2` | `NEXT_PUBLIC_BUSYTEX_BASE_URL` (Cloudflare R2 / B2 / CDN) |

Missing CTAN packages (e.g. `fontawesome5`) can still be fetched from TeXlyre at compile time.

More detail: [`docs/LATEX_COMPILATION.md`](docs/LATEX_COMPILATION.md), [`docs/BUSYTEX_CDN.md`](docs/BUSYTEX_CDN.md).

## Local development (after clone)

Requirements: Node.js 20+ and npm.

```bash
cp .env.example .env.local
npm install
npm run latex:assets         # required once — downloads BusyTeX into public/core/busytex (~600MB+)
npm run dev
```

In `.env.local` for local compile:

```bash
NEXT_PUBLIC_BUSYTEX_SOURCE=local
```

GitHub Connect is optional — set `NEXT_PUBLIC_GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` only if you need it (see `.env.example`).

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run lint
npm run typecheck
npm run build
npm run templates:sync
npm run latex:assets
```

## Deploy to Vercel (+ BusyTeX on R2)

Do **not** commit BusyTeX blobs. Production should use R2.

1. Copy `.env.example` → `.env` and fill `R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (upload-only; see comments in `.env.example`).
2. `npm run latex:assets` then `npm run busytex:upload-r2` ([docs/BUSYTEX_CDN.md](docs/BUSYTEX_CDN.md)).
3. Push **app code** only to GitHub (`.env` is gitignored; `.env.example` is committed).
4. Vercel env:
   - `NEXT_PUBLIC_BUSYTEX_SOURCE=r2`
   - `NEXT_PUBLIC_BUSYTEX_BASE_URL=https://….r2.dev/busytex`
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (if using Connect GitHub)
   - Do **not** put `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on Vercel unless CI uploads assets.
5. Deploy. Browsers load TeX from R2 on first compile.

No database or server compile service is required.

## GitHub integration

GitHub is **optional**. Local resumes work with no OAuth config.

1. Create a GitHub OAuth App → enable **Device Flow**.
2. Set `NEXT_PUBLIC_GITHUB_CLIENT_ID` (and optionally `GITHUB_CLIENT_SECRET` server-side only).
3. In the app: Connect GitHub → choose a repository.
4. Textume expects:

```text
repository/
└── resumes/
    ├── backend.tex
    ├── ai-engineer.tex
    └── …
```

If `/resumes` is missing, the UI offers **Create /resumes**. Open, create, rename, and delete act on files in that folder. Saving commits with your message.

Auth notes:

- Scope: `repo` (read/write repository contents)
- Client secret never ships in the browser bundle
- Access tokens are not stored in plain localStorage (encrypted sessionStorage)
- Only thin `/api/github/oauth/*` routes proxy device-flow HTTP (CORS)

## Adding a resume template

1. Create `templates/<id>/main.tex` (keep packages compatible with TeX Live basic: `lmodern`, `fontenc`, `geometry`, `hyperref`, etc.).
2. Register the id in `scripts/sync-templates.mjs` (`ids`, `labels`, `descriptions`).
3. Run:

```bash
npm run templates:sync
```

That regenerates `src/lib/templates/catalog.ts` (also runs on `build` / `typecheck`).

## Known limitations

- **Large BusyTeX download** — `latex:assets` / first browser compile pulls hundreds of MB (basic + recommended + extra).
- **Not every CTAN package** — richer resumes need recommended/extra (or TeXlyre remote); exotic packages may still fail.
- **No multi-file LaTeX projects** beyond a single main `.tex` in the editor (GitHub side is flat `/resumes/*.tex` only).
- **No accounts / cloud DB** — local data lives in the browser; clearing site data deletes local resumes.
- **GitHub Device Flow** must be enabled on your OAuth App.
- **BusyTeX / related engine code is AGPL**; see license notes below.
- Mobile works for editing, but the split editor/preview is optimized for desktop.

## License

Textume application source is under the [MIT License](LICENSE).

Bundled BusyTeX engine assets under `public/core/busytex/` follow their upstream licenses (typically AGPL). Review those trees before redistributing or embedding in a proprietary product.
