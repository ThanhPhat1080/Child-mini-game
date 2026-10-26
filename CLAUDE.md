# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**HaMy Project.** Calm, kid-friendly quiz hub for Hà My (4-5, cannot read) on a TV browser, plus a parent admin dashboard. Phase 1 only: quiz + admin.

## Docs (read in this order)
- `spec.md`: the Phase 1 contract. Requirement IDs C1-C12 (child) and A1-A8 (admin); cite them in tickets and commits. Items marked **[assumption]** and section 9 "Open questions" are not owner-decided; confirm before relying on them.
- `docs/decision.md`: ADRs (the why). The "ADR updates" section amends ADR-002..007; later ADRs win.
- `docs/intent.md`: original vision, including Phase 2 context. Do not build from it directly.
- `README.md`: empty. It must become the setup guide for a second child's deployment (spec 7, DoD 3).

## Stack
Next.js + React + TypeScript (DOM/CSS, no Phaser until Phase 2; ADR-027), Supabase (Postgres, Storage, Auth), Vercel. Browser-exposed env vars need the `NEXT_PUBLIC_` prefix; only the Supabase URL and anon key may use it.

## Commands
Node 24 + npm 11 (tested). On this Windows machine npm is not on the Bash PATH; use PowerShell or add Node to PATH first.

- Install: `npm ci`
- Dev: `npm run dev`
- Build: `npm run build`; prod server `npm start`
- Typecheck: `npm run typecheck`; lint: `npm run lint`
- Test: `npm test`; single file: `npx vitest run tests/tokens.test.ts`; watch: `npm run test:watch`
- E2E: `npm run e2e` (Playwright, not set up yet)
- Migrations: `supabase/migrations/*.sql` (T1 init schema applied to project `uhpsqaqejizcyzwhwnsl`). New migrations only, never hand-edit the dashboard. Add the admin once: `insert into public.admins (user_id) select id from auth.users where email = '<admin email>';`

## Architecture that spans files (from spec/ADRs)
- **Game registry** (ADR-014): the game list carousel reads from a registry; Quiz is the only entry. Phase 2 Phaser games plug in here.
- **One audio manager** (ADR-016) for music, voice and effects; music keeps playing across screens. Nothing plays before the "tap to enter" press.
- **Shared components**: the child set card is used by both the child selection screen and the admin preview strip (ADR-023). One confetti component serves correct-answer and set-completed (denser), honoring `prefers-reduced-motion` (ADR-021, ADR-026).
- **Data** (spec 5): `settings` (single row), `quiz_sets`, `questions`, `answers` (slot 1..3, exactly one correct), Storage bucket `media`. Star progress lives in localStorage keyed by set id; no user identity.
- **Access**: anon reads settings and *published* sets only. Drafts reach the child view only via admin "Preview as child" (ADR-022), so preview must use the authenticated client.
- **Input**: carousel needs a click-vs-drag threshold (ADR-018); every TV screen needs a visible focus ring and 120 px+ hit areas.

## Rules that matter
- The child cannot read: never make a screen depend on text. Every answer = image + number + fixed color (1 rose, 2 sky, 3 butter).
- Calm & Slow: soft pastel tokens from `spec.md` section 6, slow motion, no timers, no penalties, honor `prefers-reduced-motion`.
- Do not hard-code Vietnamese (or any) display text for the child; admin writes it. Fonts: Baloo 2 child, Nunito admin, self-hosted. Check diacritics.
- Child pages are read-only and unauthenticated. Writes need the admin (RLS). Never put the Supabase service role key in the frontend or commit secrets.
- Schema changes go through migrations, never edited by hand in the dashboard.
- Chromium first; avoid very new JS/CSS (TV browser). Remote keys 1/2/3 answer; Left/Right/Enter/Back navigate.
- One deployment per child, configured by env vars only (Supabase URL + anon key).
- Phase 2 (play limit, PIN, Spot the Differences, Phaser) is out of scope: do not build it.

## Workflow
Plan mode first; commit `plan.md` before code. Each ticket has Acceptance Criteria; do not mark done until they pass. When Claude makes the same mistake twice, add the fix to this file. Keep this file under one page.
