# HaMy Project

Calm, kid-friendly quiz hub for Hà My (4-5, cannot read) on a TV browser, plus a parent admin dashboard. Phase 1 only: quiz + admin. Read `spec.md` first, then `docs/decision.md` for the why.

## Stack
React + TypeScript (DOM/CSS, no Phaser until Phase 2), Supabase (Postgres, Storage, Auth), Vercel. Framework choice (Vite vs Next) is open: see `plan.md`.

## Commands
Not scaffolded yet. Once `plan.md` is approved, record here: install, dev, build, test, lint, and how to run Supabase migrations.

## Rules that matter
- The child cannot read: never make a screen depend on text. Every answer = image + number + fixed color (1 rose, 2 sky, 3 butter).
- Calm & Slow: soft pastel tokens from `spec.md` section 6, slow motion, no timers, no penalties, honor `prefers-reduced-motion`.
- Do not hard-code Vietnamese (or any) display text for the child; admin writes it. Fonts: Baloo 2 child, Nunito admin, self-hosted. Check diacritics.
- Audio only starts after the "tap to enter" press.
- Child pages are read-only and unauthenticated. Writes need the admin (RLS). Never put the Supabase service role key in the frontend or commit secrets.
- Schema changes go through migrations, never edited by hand in the dashboard.
- Chromium first; avoid very new JS/CSS (TV browser). Remote keys 1/2/3 answer; Left/Right/Enter/Back navigate.
- One deployment per child, configured by env vars only.
- Phase 2 (play limit, PIN, Spot the Differences) is out of scope: do not build it.

## Workflow
Plan mode first; commit `plan.md` before code. Each ticket has Acceptance Criteria; do not mark done until they pass. When Claude makes the same mistake twice, add the fix to this file. Keep this file under one page.
