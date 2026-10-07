# Contributing to Textume

Thanks for helping. Keep changes small and focused — Textume should stay a lightweight browser resume tool.

## Development setup

```bash
npm install
cp .env.example .env.local   # only if testing GitHub
npm run latex:assets         # if BusyTeX assets are missing
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run typecheck
npm run build
```

## Guidelines

- Prefer fixing/deleting code over new abstractions.
- Do not add a backend, database, or compile API for resumes.
- Local resumes must keep working without GitHub.
- Compilation stays in the browser via `src/lib/latex/compiler.ts`.
- GitHub features belong under `src/lib/github/` and should stay optional.
- Match existing TypeScript, React, and Tailwind patterns.
- Skip comments unless something is non-obvious.

## Templates

See the README section **Adding a resume template**. After editing `templates/` and `scripts/sync-templates.mjs`, run `npm run templates:sync`.

## Pull requests

1. Use a clear branch name and short description of *why*.
2. Note how you tested (local create/compile, GitHub connect if touched).
3. Do not commit secrets (`.env.local`, OAuth client secrets, tokens).

## Reporting issues

Include browser, steps to reproduce, and whether the resume was local or GitHub-backed. For compile failures, attach the log from the editor when possible.
