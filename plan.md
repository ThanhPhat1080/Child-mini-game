# Plan: HaMy Phase 1 (Quiz MVP + Admin)

Source: `spec.md` (requirement IDs C1-C12, A1-A8), `docs/decision.md` (ADRs). Stack per ADR-027: Next.js + React + TypeScript, Supabase, Vercel.
Status: draft for owner review. Nothing is scaffolded yet.

## 1. Decisions to confirm
Recommended defaults; the owner can override before T0 starts.

| Topic | Default |
|-------|---------|
| Router | Next.js App Router, TypeScript `strict` |
| Styling | Plain CSS Modules + CSS variables for the spec section 6 tokens. No Tailwind (light bundle for TV) |
| Data access | Child routes are client-rendered and read-only through the Supabase anon client. Admin under `/admin/*`, guarded by middleware + Supabase Auth (`@supabase/ssr`) |
| Browser targets | `browserslist` set to older Chromium so no very new JS/CSS ships (ADR-012) |
| Tooling | npm; Vitest + Testing Library (unit); Playwright (key flows); ESLint + `tsc --noEmit` |
| Migrations | Supabase CLI, `supabase/migrations/*.sql` (ADR-008) |
| Open spec questions | Star progress in localStorage; silent when no greeting/music; fixed question order; up/down buttons for reorder (A8) |

## 2. Architecture sketch
- `app/(child)/`: Welcome, game list, set selection, question, completed. Read-only, unauthenticated.
- `app/admin/`: sign-in, settings, set list, set editor, question editor, preview. Authenticated.
- `lib/supabase/`: browser client (anon) and server/middleware client. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; never the service role key (ADR-015).
- `lib/audio/`: one audio manager for music, voice, effects; music persists across screens (ADR-016).
- `lib/games/registry`: game list reads from a registry; Quiz is the only entry (ADR-014).
- `components/`: `SetCard` (shared by child and admin preview, ADR-023), `Confetti` (shared, dense variant for completed, ADR-026), `AnswerCard` (fixed slot colors, ADR-019).
- RLS: anon `select` on settings and published sets with their questions/answers; authenticated admin does everything including storage writes. Draft preview uses the authenticated client (ADR-022).

## 3. Tickets
Done only when every Acceptance Criterion (AC) passes.

### T0 Scaffold
Next.js + TS app, scripts (dev, build, lint, typecheck, test, e2e), `browserslist`, self-hosted Baloo 2 and Nunito, design tokens, global focus ring and `prefers-reduced-motion` base.
- AC: install, dev, build, lint, typecheck and test all run clean on a fresh clone.
- AC: Vietnamese diacritics (e.g. "Hà My ơi, bé ngoan") render correctly in both fonts with no CDN request.
- AC: `CLAUDE.md` "Commands" updated with the real commands, including single-test and migrations.

### T1 Schema, RLS, storage (spec 5; ADR-008, 015, 024)
- AC: migrations create `settings`, `quiz_sets`, `questions`, `answers`, bucket `media`, with unique `(question_id, slot)` and exactly-one-correct enforced by constraint/trigger.
- AC: as anon, only settings and published sets/questions/answers are readable; every write is denied.
- AC: as admin, all writes succeed, including drafts and storage uploads. Storage policy rejects non-image types and files over 2 MB for images.
- AC: migrations apply cleanly to an empty Supabase project.

### T2 Admin sign-in (A1)
- AC: valid email + password opens admin; wrong credentials show an inline error.
- AC: unauthenticated visits to any `/admin/*` route redirect to sign-in.

### T3 Admin settings (A2)
- AC: save child name; upload greeting audio and background music; each has play-to-check.
- AC: values persist after reload and are readable by the child app.
- AC: "Feedback sounds" section: optional custom audio track for "Hooray", "Oh-oh" and "You did it", each with a play button (previews the custom track, or the built-in sound when none is set; every row toggles play / pause icons the same way as greeting and music), Replace, and "Use built-in" (columns `settings.hooray_path`, `ohoh_path`, `complete_path`).

### T4 Admin set list and preview strip (A3; ADR-023)
- AC: table shows name, question count, draft/published; actions new, edit, delete (with confirmation).
- AC: preview strip renders with the same `SetCard` component as the child screen.

### T5 Set editor (A4; ADR-020)
- AC: name, optional sub-title, status, 6 color presets + picker + hex input, low-contrast warning.
- AC: cover upload with live preview; saved set reflects in the preview strip.

### T6 Question editor (A5, A6, A8; ADR-022, 024)
- AC: prompt text and/or audio, 2-3 answers each with an image, exactly one correct.
- AC: question image is optional and small: 600x300 px frame (2:1), fitted not cropped, SVG (best) / PNG / JPG / WebP, max 2 MB; its absence never blocks Save.
- AC: prompt voice is upload only (mp3/m4a/wav); no in-browser recording.
- AC: a "Read the answers aloud" checkbox per question (default on, column `questions.read_answers`); when off, only the question is read and the answers are not read one by one after it. The answer the child picks is always read aloud, regardless of the checkbox.
- AC: each answer has an optional text field ("Answer text (read aloud)"); it is saved with the answer and does not block completeness.
- AC: the sticky page header keeps Save, Revert and Preview as child visible while scrolling the set and question editors.
- AC: "Preview as child" opens the child quiz in a new browser tab.
- AC: the answer image button reads "Upload image" (also "Upload" when empty), never "Replace image".
- AC: a "Revert" button sits next to "Save" and discards unsaved edits back to the last saved state.
- AC: completeness checklist lists what is missing; Save is disabled until complete.
- AC: delete question only from the editor panel, always with confirmation.
- AC: up/down buttons reorder questions and the order persists.
- AC: creating a 5-question set takes under 10 minutes (timed manual check, DoD 2).

### T7 Audio manager and Welcome (C1; ADR-016)
- AC: no audio plays before "tap to enter"; after the press the greeting plays, music loops, then "Start game" appears.
- AC: child name from settings and the princess illustration show; missing audio is silent without errors.
- AC: music on/off button is always visible at the bottom-left of Welcome and toggles music by click.
- AC: music keeps playing across all later screens.

### T8 Game registry and carousel (C2; ADR-014, 018)
- AC: only "Quiz" is listed, from the registry.
- AC: Left/Right keys, click-and-hold drag, arrow buttons and dots all move it; a drag never triggers the card click; Enter/click opens the game.

### T9 Set selection (C3, C11)
- AC: published sets show cover, heading-colored name, optional sub-title, question-count pill, and a star when finished; selectable by click and by arrows + Enter.
- AC: with no published sets, a friendly picture screen shows, not an error.

### T10 Question screen (C4-C6, C9, C10, C12; ADR-007, 019, 021, 025)
- AC: three bands (header, question row, answers) with no overlap at 1920x1080; prompt audio plays if present, with a replay button.
- AC: 2-3 answers show image + number + fixed color (1 rose, 2 sky, 3 butter); click/tap and keys 1/2/3 answer; no timer.
- AC: the reading of all answers after the question happens only when the question's "Read the answers aloud" is on; the picked answer is always read.
- AC: on a new question the app waits 0.5 s, reads the question aloud (recorded voice if uploaded, else kid voice), then reads each answer's text aloud with 1 s between answers (the card being read bounces and wiggles with a glowing ring and sound bars, the others dim slightly; static ring with reduced motion); the replay button repeats this; picking an answer stops the reading.
- AC: when the child picks an answer, the app first reads that answer's text aloud (if any), then shows the Hooray popup right away, or the Oh-oh popup 1 s after the reading ends, each with its sound; further picks are ignored while it reads.
- AC: the Hooray and Oh-oh sounds use the custom track from Settings when set, else the built-in sound.
- AC: on the Hooray popup there is no button; it shows "Continue in 3s / 2s / 1s" with a 3 s countdown, then closes and goes to the next question (last question: goes to the completed screen).
- AC: the "Oh-oh… try again!" popup is centered on the screen and disappears after 2 s.
- AC: wrong answer dims the card gently with an "oh-oh" sound and the "Oh-oh… try again!" toast, which disappears after 2 s; retry allowed, no penalty.
- AC: question dots are clickable to jump to that question, and "n / total" is shown; the replay-voice and music buttons are clickable with press animation.
- AC: correct answer plays a kid-voice "Yay, hooray!" sound with slow pastel confetti, then advances. Sounds are synthesized/browser voice for now; recorded kid-voice files can replace them later.
- AC: with `prefers-reduced-motion`, confetti and transitions are disabled or reduced.
- AC: no screen depends on text; no hard-coded child-facing text.

### T11 Completed and back navigation (C7, C8, C12; ADR-026)
- AC: completed screen shows girl image, light confetti (simpler and fewer than before), praise, and a way back to set selection; the set is marked finished (star).
- AC: if a "You did it" custom track is set in Settings, the completed screen plays it instead of the built-in applause and spoken praise.
- AC: completed screen plays applause and says "You did it, <child name>!".
- AC: Esc/Back key and a picture button go from set selection to game list and from a question to set selection.

### T12 Preview as child (A7; ADR-022)
- AC: enabled only after the set is saved; plays the set as the child sees it, including drafts, without publishing.

### T13 Performance, TV pass, deploy (spec 7)
- AC: images for the current and next question are preloaded; app interactive in under 3 s on a home network.
- AC: buttons are at least 120 px high on TV screens; visible focus ring for remote navigation.
- AC: deployed on Vercel; full flow works in Chromium cast to the TV; the URL opens once in the LG webOS browser with no major problems.

### T14 Setup README (DoD 3)
- AC: README covers creating the Supabase project, running migrations, creating the admin user, env vars, and deploying to Vercel.
- AC: a second child's deployment is set up from the README alone with no code changes.

### T15 Free replaced and removed media (storage hygiene; A2, A4, A5)
Files are uploaded as soon as they are picked, but only a successful Save/commit decides what stays. Never delete before Save, so Revert keeps working.
- AC: on Save of a set, every file that the last saved state referenced but the saved state no longer does (replaced, removed, or belonging to a deleted question) is deleted from the `media` bucket; the database no longer points to it.
- AC: choosing a picture or voice file (set editor: cover, question image, question voice, answer images; Settings: avatar) only shows a local preview. Nothing is sent to the bucket until the user presses Save (Settings: "Save changes"); a file replaced, removed or reverted before Save is never uploaded.
- AC: on Save, the chosen files are uploaded first, then the database is written. If an upload fails, the files already uploaded in that attempt are deleted, the database is not written, and an error is shown.
- AC: type and the 2 MB image limit are checked when the file is chosen, with an immediate message.
- AC: deleting a set (from the set list or the editor) also deletes its cover, question images, question voices and answer images from the bucket.
- AC: on Settings, replacing or removing the avatar, greeting, background music or a feedback sound ("Use built-in") deletes the old file right after the database update succeeds.
- AC: only files inside the `media` bucket are ever deleted. Bundled sample art (`seed/...`) and external image URLs are never touched.
- AC: if the database save fails, no file is deleted; if a file delete fails, the save still succeeds and the admin sees a non-blocking notice.
- AC: unit tests cover the "which paths to delete" logic (replace, remove, deleted question, seed/URL paths, revert).

### T16 Quick import of questions from JSON (A5, A6; extends T6)
- AC: in the set editor, the same row as "Delete this quiz set" has a blue "+ Quick import questions" button at the left; "Delete this quiz set" stays at the right. The button also shows for a new, unsaved set.
- AC: the button opens a modal with a backdrop. It shows a short guide, a "Download quiz-template.json" button (file `public/quiz-template.json`), and a JSON file picker. Esc and Cancel close it.
- AC: the guide says: images can be left blank and uploaded later, or can be `https://` links from the internet; question image up to 2 MB, best at 600 x 300 px; answer image 84 x 84 px; SVG is best for sharp scaling (PNG, JPG, WebP also work).
- AC: template JSON has `questions[]`, each with `text`, optional `image`, `readAnswersAloud`, and 2-3 `answers[]` (`text`, `image`, `correct`). Blank `""` or missing image is allowed.
- AC: validation runs before anything changes and lists every problem with its question number (invalid JSON, no questions, answers not 2-3, not exactly one correct, image that is not blank or an `https://` URL, file over 1 MB, more than 50 questions). Nothing is imported when there is any error.
- AC: a valid file shows "N questions ready"; "Import" appends them to the end of the current set as unsaved changes (Save and Revert behave as usual); incomplete ones (blank image or text) show in the completeness checklist and can be finished by hand.
- AC: image URLs from the internet are stored as-is and render in the editor and the child app; they are never deleted by T15.
- AC: `image` may also be raw SVG code (`<svg ...>...</svg>`). It is checked (starts with `<svg`, ends with `</svg>`, valid XML, at most 30,000 characters, no script, event handler, foreignObject, DOCTYPE or link to outside files; `xmlns` is added when missing) and any error is listed with its question and answer number.
- AC: SVG code is not stored in the database. On import it becomes a local preview like any picked file and is uploaded as a small `.svg` file on Save.
- AC: identical SVG code (ignoring spacing) used in several answers and/or the question image creates ONE pending file and ONE uploaded file, and all those fields point to the same path; a different drawing gets its own file.
- AC: a file shared by several answers is deleted only when none of them uses it any more (T15).
- AC: uploaded file names are unique (timestamp plus random suffix), so several files saved in the same moment never collide.
- AC: SVG uploads are accepted in the editor and Settings (bucket allows `image/svg+xml` via a new migration).
- AC: unit tests cover the parser/validator (valid file, each error, blank images, URLs, the template file itself).

## 4. Out of scope (Phase 2)
Play limit, cool-down, rest screen, PIN, Spot the Differences, Phaser, full webOS testing with the real remote.

## 5. Risks
- Browser autoplay policy: audio only after "tap to enter" (T7).
- webOS browser may lack newer JS/CSS: keep `browserslist` conservative and check once on the TV (T13).
- Draft preview vs RLS: preview must use the authenticated client (T12).
- Large uploads: validate type and size on client and in Storage policy, compress before storing (T6).
- Deleting a file still referenced elsewhere would break a picture: delete only paths the previous saved state owned and the new state no longer uses, and only after the database write succeeds (T15).
- External image URLs can disappear or block hot-linking; the admin can replace them later. `http://` links are rejected because the site is served over HTTPS (T16).
- SVG files are user-supplied: they are shown only through `<img>` tags (scripts do not run there) and only an authenticated admin can upload them (T16).

## 6. Definition of done (spec 8)
1. Child goes from Welcome to the end of a set without anyone reading to her.
2. A parent creates a set with at least 5 questions in under 10 minutes.
3. A second child's deployment is set up from the README with no code changes.
