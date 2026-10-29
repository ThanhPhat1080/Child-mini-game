# Spec: HaMy Phase 1 (Quiz MVP + Admin)

Source: `docs/intent.md`, `docs/decision.md` (ADR numbers below), prototype https://claude.ai/artifact/L1YRtj4NVFe6NewZ3w2s4E
Status: **Phase 1 CLOSED 2026-10-28 by the PO.** Platform is a computer browser (ADR-028); casting the screen to a TV works but is not a requirement. Leftovers and known gaps (including the device-dependent voice) are listed in `plan.md` section 4.

## 1. Goal and scope
Hà My (4-5, cannot read) finishes a full quiz set by pictures, color and sound only, on a computer (keyboard + mouse, may be cast to a TV). Parents manage all content in the app. Same code is reused per child (one Supabase project + one deployment, ADR-009).
Out of scope for Phase 1: everything in Phase 2. Phase 2 is now "other games" (see `plan.md` section 5); play limit, rest screen and PIN are parked.

## 2. Users
- **Child:** no sign-in, read-only access to published content.
- **Parent/admin:** signs in with Supabase Auth email + password (ADR-015), the only writer.

## 3. Child flow (computer browser; layout designed on a 1920x1080 canvas scaled to the window, ADR-012, ADR-028)
| ID | Requirement |
|----|-------------|
| C1 | Welcome: large "tap to enter" button. On press: greeting audio plays, background music starts (looping), then "Start game" appears (ADR-016). Princess illustration at the left. Shows the child's name from settings. |
| C2 | Game list: carousel with only "Quiz". Moves with Left/Right keys, click-and-hold drag, arrow buttons, dots. A drag never triggers the card click (ADR-018). Enter/click opens the game. Registry-based so more games can be added later (ADR-014). |
| C3 | Quiz set selection: cards of published sets: cover, name in heading color, optional sub-title, question-count pill, star if finished (ADR-020). Select with click, or by keyboard: Left/Right arrows move between sets, Enter or Space opens one. |
| C4 | Question: shows prompt image/text and plays prompt audio if present. 2-3 answers, each an image + number + fixed color (1 rose, 2 sky, 3 butter, ADR-019). Choose by click, keys 1/2/3 (ADR-007), or Left/Right arrows to move between the answers and Enter or Space to pick the focused one. No timer. |
| C5 | Wrong answer: soft "Oh-oh", the wrong card dims gently, child tries again. No penalty, no lives. |
| C6 | Correct answer: "Hooray!" with slow pastel confetti, then a 3 s "Continue in 3s" countdown moves to the next question (ADR-021). |
| C7 | Set completed screen with praise and a way back to set selection. The set is marked finished (star). |
| C8 | Navigation back (Esc/Back key and a picture button) from set selection to game list and from a question to set selection. |
| C9 | No screen requires reading. Any text is decorative or admin-written. Vietnamese diacritics render correctly (ADR-017). |
| C10 | Motion is slow; `prefers-reduced-motion` disables or reduces confetti and transitions (ADR-006, ADR-021). |
| C11 | Empty state: if there are no published sets, show a friendly picture screen, not an error. |
| C12 | Question screen has three bands (header, question row with image + replay-voice + text, answers) with no overlap (ADR-025). Set-completed screen shows the girl image and a light confetti burst with applause and a spoken "You did it" (ADR-026). |
| C13 | Game list: the "?" on the Quiz card and the "? Quiz" badge on set selection open a "How to play" popup (4-step carousel); the large avatar shows a "Let's play with me!" bubble when tapped. Added after the first draft (plan T8, T9). |
| C14 | Question reading: the question is read aloud, then each answer (unless the question's "Read the answers aloud" is off); the picked answer is always read before the Hooray / Oh-oh popup; Hooray / Oh-oh / You did it can use custom sounds from Settings. Added after the first draft (plan T3, T10, T11). |
| C15 | Progress: a question is finished only when its right answer is picked; finished questions are kept per set in localStorage and cleared when the set is completed (the star stays). Added after the first draft (plan T10, T11). |

## 4. Admin flow (desktop, Nunito)
| ID | Requirement |
|----|-------------|
| A1 | Sign-in with email + password. Wrong credentials show an inline error. Unauthenticated users cannot open admin routes. |
| A2 | Settings: child's name, upload greeting audio, upload background music (with play-to-check), optional custom sounds for Hooray, Oh-oh and You did it, save. |
| A3 | Set list: table of sets (name, question count, status draft/published) and a front-page preview strip that mirrors C3 using the same card component (ADR-023). Actions: new set, edit, delete. |
| A4 | Set editor: name, optional sub-title, heading color (6 presets + custom color picker + hex input, low-contrast warning), cover upload with live preview, status, question list. |
| A5 | Add/edit question: prompt text and/or prompt audio, prompt image (optional; PNG/JPG/WebP, max 2 MB, best 600x300, shown in a small 600x300 frame, fitted not cropped, ADR-024); prompt audio is upload only (no recording); Save has a Revert button next to it; answer image button says "Upload image", 2-3 answers each with an image upload, exactly one marked correct; each question has a "Read the answers aloud" checkbox (default on) that controls only reading all answers after the question; the picked answer is always read; each answer may have a text that is read aloud when the child picks it (the Hooray / Oh-oh popup follows the reading); "Preview as child" opens in a new tab; the editor header with Save / Revert stays visible while scrolling. Completeness checklist shows what is missing; Save is disabled until complete (ADR-023). |
| A6 | Delete set and delete question always ask for confirmation. Questions are deleted only from the editor panel (ADR-022). |
| A7 | "Preview as child" is enabled after the set is saved; it plays the set as the child sees it, including drafts, without publishing (ADR-022). |
| A8 | Reorder questions with simple up/down buttons. |
| A9 | Quick import of questions from a JSON file (images blank, https URLs or raw SVG code), validated before anything changes (plan T16). Added after the first draft. |
| A10 | Storage hygiene: files are uploaded only on Save; replaced, removed or deleted media is freed from the bucket after a successful save (plan T15). Added after the first draft. |

## 5. Data model (Supabase / Postgres)
Column names are as built in `supabase/migrations/*.sql`.
- `settings` (single row): `child_name`, `greeting_path`, `music_path`, `music_volume`, `avatar_path`, `hooray_path`, `ohoh_path`, `complete_path`.
- `quiz_sets`: `id uuid pk`, `title text not null`, `subtitle text null`, `heading_color text not null default '#5A4038'`, `cover_path text null`, `status text check in ('draft','published') default 'draft'`, `position int`, `created_at`.
- `questions`: `id uuid pk`, `set_id uuid fk on delete cascade`, `position int`, `prompt_text text null`, `prompt_image_path text null`, `prompt_audio_path text null`, `read_answers bool default true`.
- `answers`: `id uuid pk`, `question_id uuid fk on delete cascade`, `slot int check 1..3`, `image_path text not null`, `text text null`, `is_correct bool`. Unique `(question_id, slot)`; exactly one correct per question (enforced in app + constraint/trigger).
- `quiz_sets` also has `updated_at`.
- Storage bucket `media`: public read, write only by admin; images (PNG/JPG/WebP/SVG) and audio.
- Progress (star and finished-question dots): stored in the browser's localStorage, keyed by set id (decided); no user identification (ADR-010).
- RLS: anon can `select` settings, published sets and their questions/answers; only authenticated admin can insert/update/delete everything, including drafts and storage writes. Service role key never in the frontend (ADR-015). Schema changes only via migrations (ADR-008).

## 6. Design tokens (from prototype)
Ground `#FBF4E9`, ink `#5A4038`, rose `#E59AA1`/`#F8DCDF`, sky `#8FB3D1`/`#DCE8F1`, butter `#E5C979`/`#F7ECCB`, sage `#9CC3A4`, peach `#F5D9C4`. Fonts: Baloo 2 (child), Nunito (admin), self-hosted.

## 7. Non-functional
- Stack: Next.js + React + TypeScript on Vercel, Supabase backend (ADR-027).
- Latest Chromium-based browser on a computer (ADR-012, ADR-028). The laptop keyboard is fully supported for the child: keys 1/2/3, Left/Right arrows to move between choices, Enter or Space to pick, Esc to go back. Mouse works too.
- Large, friendly buttons for a small child and a visible focus ring (kept in the UI, no longer tied to a TV).
- Preload images for the next question and a 3 s start: **not built, parked** (`plan.md` section 4).
- Audio manager shared by music, voice and effects; music keeps playing across screens.
- Setup README: a second child's deployment from README only (env vars: Supabase URL + anon key).

## 8. Definition of done (Phase 1)
1. Child goes from Welcome to the end of a set without anyone reading to her.
2. A parent creates a set with at least 5 questions in under 10 minutes.
3. A second child's deployment is set up from the README with no code changes.

## 9. Decisions on the former open questions (2026-10-28)
- Star progress: localStorage (as built; no identity).
- No greeting/music uploaded: silent (as built).
- Replaying a finished set: fixed order (as built).
