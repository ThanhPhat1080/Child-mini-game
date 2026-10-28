# Git workflow and deployment

Authoritative rules for branches, PRs and deploys. Claude must follow this exactly.

## Branches
| Branch | Purpose | Deploys to |
|---|---|---|
| `main` | Production. Protected. Only receives PRs from `develop`. | Vercel Production |
| `develop` | Integration/development. Default target for all work. | Vercel Preview |
| feature/fix branches (incl. `claude/*`) | Short-lived work, branched from `develop`. | Vercel Preview |

## Flow for every change (Claude follows this exactly)
1. **Branch from the user's local `develop`.** `git fetch origin`, `git checkout develop`, `git pull origin develop`, then `git checkout -b <branch>` (use the `claude/*` name the session assigns, otherwise `claude/<short-topic>`). Do this before editing anything, and never keep working on an old feature branch. The user can then `git fetch` and check out the branch to test locally.
2. **Change and check.** Edit, then run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Fix failures before going on.
3. **Commit and push** the branch. **Every time a new branch is created, tell the user so, with the exact commands to switch their local git to it** (`git fetch origin && git checkout <branch>`), and how to test (`npm ci && npm run dev`). Keep it short.
4. **Open a PR** with base `develop` and head the new branch (use the PR template if one exists) and show the user the PR link.
5. **Deploy that branch.** Claude may create a Vercel **Preview** deployment of the new branch and share its URL.
6. **Wait for the user's OK.** Never merge before it. If the user asks for changes, push more commits to the same branch and update the PR.
7. **After the OK:** merge the PR into `develop` (repository's default merge method), then create a Preview deployment of `develop`, share the URL, and start the next task again from step 1 with the fresh `develop`.
8. **Release:** `develop` -> `main` only when the user asks (see "Release checklist").

## Deploying: what Claude may and may not do
- **May, without asking:** Preview deployments of the task branch (step 5) and of `develop` (step 7). Vercel's Git integration also builds a Preview automatically for every pushed branch.
- **Only when the user asks:** deploying or promoting to **Production** (`main`), changing Vercel project settings, env vars, domains or Deployment Protection, and anything outside this repo's Vercel project.

## Rules
1. Every change starts from the latest local `develop` on a new branch (step 1).
2. Every PR has **base = `develop`**. Never open a PR from a feature branch into `main`.
3. The only PR allowed into `main` is **`develop` -> `main`**, and only when the user asks for a release.
4. Never push directly to `main` or `develop`, and never force-push either one. `develop` changes only by merging a PR after the user's OK.
5. Do not merge a PR the user has not approved.
6. Before a release PR, `develop` must have green CI and a passing `npm run build`.
7. Commits cite spec IDs (C1-C15, A1-A10) where relevant, per `CLAUDE.md`.

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
- Deployment Protection (Vercel login) blocks the child from opening the page. Turn it off for the child-facing domain.

## Supabase (project `uhpsqaqejizcyzwhwnsl`)
Authentication -> URL Configuration:
- Site URL: the Production URL above (or the custom domain).
- Redirect URLs: `<production URL>/**`, `http://localhost:3000/**`, and for previews `https://*-pht-trngs-projects.vercel.app/**`.
Schema changes go through `supabase/migrations/*.sql` only (see `CLAUDE.md`).

## Release checklist (`develop` -> `main`)
1. `develop` is green and `npm run build` passes.
2. New migrations are applied to Supabase before merging.
3. PR base `main`, head `develop`; merge; confirm the Production deployment is Ready.
