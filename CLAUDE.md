# CLAUDE.md

**HaMy.** Calm quiz hub for Hà My (4-5, cannot read) in a computer browser, plus a parent admin dashboard. Phase 1 is closed. Phase 2 = only more games: specs and plans live in `docs/superpowers/specs` and `docs/superpowers/plans` (Memory Match, Listen & Pick and Spot the Differences each have a spec and plan there). Phase 2 work for the current game goes through the integration branch `claude/phase2/listen-pick` (see `docs/git-workflow.md`).

## Docs
`spec.md` (requirement IDs C1-C15, A1-A13, A14-A16, G1, M1-M10, L1-L10, S1-S10; cite them in commits), `plan.md` (tickets + acceptance criteria), `docs/decision.md` (ADRs; later ones win), `docs/git-workflow.md`, `docs/superpowers/` (Phase 2 specs and plans). `docs/intent.md` is the vision, not a build source. `README.md` is still empty (plan T14).

## Stack and commands
Next.js + React + TypeScript (DOM/CSS; Phaser only if HTML/CSS cannot do it, ADR-030), Supabase (Postgres, Storage, Auth), Vercel. Node 24.
`npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` (single file: `npx vitest run tests/<file>`). E2E is set up: `npm run e2e` (Playwright, Chromium; builds and starts the app on port 3100 against a stand-in Supabase on port 54391, `e2e/support/`, both set in `playwright.config.ts`). On the cloud image set `PW_CHROMIUM_PATH` to the preinstalled Chromium; never run `playwright install` there.
Schema changes only via new `supabase/migrations/*.sql`, never by hand in the dashboard.

## Rules
- The child cannot read: no screen depends on text, and no child-facing text is hard-coded (the admin writes it). Answers are image + number + fixed color (1 rose, 2 sky, 3 butter).
- Calm & Slow: pastel tokens from `spec.md` section 6, slow motion, no timers or penalties, honor `prefers-reduced-motion`. Fonts: Baloo 2 (child), Nunito (admin), self-hosted.
- Child pages are read-only and unauthenticated; writes need the admin (RLS). Anon sees published sets only; "Preview as child" uses the authenticated client. Never put the Supabase service role key in the frontend or commit secrets. Only the Supabase URL and anon key may use `NEXT_PUBLIC_`.
- Desktop Chromium only, no TV work (ADR-028). Child keyboard: 1/2/3 answer, Left/Right move, Enter/Space pick, Esc back (`lib/keynav.ts`); keep a visible focus ring.
- Games plug into the registry (ADR-014). One audio manager; nothing plays before "tap to enter". One deployment per child, configured by env vars only.

## Workflow
Each ticket has acceptance criteria; do not mark it done until they pass. When Claude makes the same mistake twice, add the fix here. Keep this file under one page.

## Git
`main` = production, `develop` = integration. Branch from latest `develop`, PR into `develop`, merge only after the user's OK; `develop` -> `main` only when asked. Never push or force-push to `main`/`develop`. Tell the user each new branch name (`git fetch origin && git checkout <branch>`). Production deploys and Vercel settings only when asked.
