# Browser LaTeX compilation (Phase 4)

## Engine

Textume compiles LaTeX **entirely in the browser** with a WASM PdfTeX engine.

### Active engine: BusyTeX (`texlyre-busytex`)

- Package: [`texlyre-busytex`](https://www.npmjs.com/package/texlyre-busytex)
- Assets: `NEXT_PUBLIC_BUSYTEX_SOURCE=local|r2` + optional `NEXT_PUBLIC_BUSYTEX_BASE_URL` (see [BUSYTEX_CDN.md](./BUSYTEX_CDN.md))
- On-demand packages: `https://texlive2026.texlyre.org` (e.g. `fontawesome5`)
- API entry: `src/lib/latex/compiler.ts` → `compileLatex({ source, files?, mainFile? })`
- Runner wrapper: `src/lib/latex/busytex-engine.ts`

Download / refresh assets:

```bash
npx texlyre-busytex download-assets ./public/core
```

Keep `texlive-basic`, `texlive-recommended`, and `texlive-extra` under `public/core/busytex/` so resume packages (`enumitem`, `titlesec`, `xcolor`, …) compile without rewriting source.

### Why BusyTeX (not SwiftLaTeX)?

SwiftLaTeX’s online TeX Live mirror has been unreliable (HTTP 522), so Textume ships BusyTeX with local TeX Live data packages under `public/core/busytex/`, plus TeXlyre remote fetch for packages not in those trees.

## Verified flow

1. Initialize BusyTeX runner (Web Worker, `engineMode: "combined"`) and preload `texlive-basic.js`.
2. On compile, attach `texlive-recommended` + `texlive-extra` and set `remoteEndpoint` to TeXlyre.
3. Compile `main.tex` (+ optional project files) via `PdfLatex` **without** stripping packages from the source.
4. Return PDF bytes, log, and success/failure.

## Limitations

- **Browser only.** No app backend; source is not uploaded to our servers.
- **Large static assets.** Basic ≈ 90MB; recommended ≈ 196MB; extra ≈ 333MB under `public/core/busytex/`. First compile that needs recommended/extra downloads those packages over HTTP from this app (still client-side).
- **Remote packages.** Icons and other CTAN packages missing from local trees are fetched from TeXlyre (requires network on first use).
- **First engine init is slow** (Wasm + basic data). First full-package compile is slower until recommended/extra are cached.
- **AGPL.** BusyTeX engine assets are AGPL-3.
- Auto-compile is optional and debounced in the resume editor.
