# Task 0 report: Playwright harness and stand-in Supabase

## Built
- `playwright.config.ts`: Chromium only, workers 1, trace on first retry, `PW_CHROMIUM_PATH` -> executablePath, `--no-sandbox`, testDir `e2e`, webServer array (stand-in on 54321; `npm run build && npm start` on 3000 with stand-in URL + dummy anon key).
- `e2e/support/standin-supabase.mjs`: in-memory HTTP server. REST for memory_cards/settings/quiz_sets/questions/answers (select ignored, eq/neq/in/is/gt/gte/lt/lte/not, order, limit, offset, single-object Accept -> 406 when not 1 row, insert/upsert merge-duplicates with on_conflict, PATCH, DELETE, return=representation), rpc is_admin (true only for an issued bearer token), auth password + refresh_token grants (JWT-shaped access token), /auth/v1/user, logout, storage upload/delete/public GET, CORS + preflight, `/__reset`, `/__state`.
- `e2e/support/fixtures.ts`: reset, getState, makeCards, signInAsAdmin (real login form).
- `e2e/smoke.spec.ts`: 3 tests as in the brief.
- `.github/workflows/e2e.yml` (no secrets), `.gitignore` already had test-results/ and playwright-report/, CLAUDE.md stack line updated, docs/git-workflow.md integration-branch note.

## RED
`npm run e2e` before the config existed: Playwright's default config ran vitest files under tests/ and crashed ("at Object.<anonymous> (.../vitest/index.cjs)"); no e2e spec could run (config and stand-in missing).

## GREEN
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npm run e2e` -> 3 passed. Gate: typecheck ok, lint ok, `npm test` 11 files / 120 tests pass, build ok.

## Concerns
- Without `PW_CHROMIUM_PATH` on this image e2e fails (no downloaded browser); the path is /opt/pw-browsers/chromium-1243/chrome-linux64/chrome.
- Next warns that `middleware` is deprecated in favor of `proxy` (pre-existing).
- Stand-in ignores `select` nesting (questions(...)) and column defaults beyond id/created_at/active; extend when later tasks need it.
- reuseExistingServer is on locally, so a stale server on 3000/54321 is reused (off in CI).
