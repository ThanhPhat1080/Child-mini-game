# Git workflow and deployment

Authoritative rules for branches, PRs and deploys. Claude must follow this exactly.

## Branches
| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production. Protected. Only receives PRs from `develop`. | Vercel Production |
| `develop` | Integration/development. Default target for all work. | Vercel Preview |
| feature/fix branches (incl. `claude/*`) | Short-lived work, branched from `develop`. | Vercel Preview |

## Rules
1. Branch every change from the latest `develop` (`git fetch origin develop`).
2. Open every PR with **base = `develop`**. Never open a PR from a feature branch into `main`.
3. The only PR allowed into `main` is **`develop` -> `main`**, and only when the user asks for a release.
4. Never push directly to `main` or `develop`; never force-push either one.
5. Open a PR only when the user asks for it. Use the PR template if one exists.
6. Before a release PR, `develop` must have green CI and a passing `npm run build`.
7. Commits cite spec IDs (C1-C12, A1-A8) where relevant, per `CLAUDE.md`.

## One-time GitHub setup (owner does this; Claude's tools cannot set protection)
Settings -> Branches -> Add branch ruleset (or classic rule) for `main`:
- Require a pull request before merging (at least 1 approval, or 0 if solo).
- Require status checks to pass (add the Vercel check once it appears).
- Block force pushes and deletions. Do not allow bypass.
- Optional: restrict who can push; require branches to be up to date.
Optionally protect `develop` the same way, minus the approval requirement.
Then Settings -> General -> Default branch -> `develop`, so new PRs default to it.

## Vercel
- Project `hamy` (`prj_KVzfSXzF79cV7P06KzSZb2ty7l0R`, team `team_EQpxI9UD0RTJoN02Cj8dmyt8`), linked to `ThanhPhat1080/Child-mini-game`.
- Production branch is `main`; every other branch gets a Preview deployment.
- Env vars (Production, Preview, Development): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nothing else may use `NEXT_PUBLIC_`. Never add the service role key.
- Install is `npm ci`: keep `package-lock.json` in sync (run `npm install` after changing dependencies and commit the lockfile).
- Production URL: `https://hamy-pht-trngs-projects.vercel.app`.
- Deployment Protection (Vercel login) blocks the TV browser. Turn it off for the child-facing domain.

## Supabase (project `uhpsqaqejizcyzwhwnsl`)
Authentication -> URL Configuration:
- Site URL: the Production URL above (or the custom domain).
- Redirect URLs: `<production URL>/**`, `http://localhost:3000/**`, and for previews `https://*-pht-trngs-projects.vercel.app/**`.
Schema changes go through `supabase/migrations/*.sql` only (see `CLAUDE.md`).

## Release checklist (`develop` -> `main`)
1. `develop` is green and `npm run build` passes.
2. New migrations are applied to Supabase before merging.
3. PR base `main`, head `develop`; merge; confirm the Production deployment is Ready.
