# Spec: HaMy Phase 1 (Quiz MVP + Admin)

Source: `docs/intent.md`, `docs/decision.md` (ADR numbers below), prototype https://claude.ai/artifact/L1YRtj4NVFe6NewZ3w2s4E
Status: draft for owner review. Items marked **[assumption]** were not decided by the owner.

## 1. Goal and scope
Hà My (4-5, cannot read) finishes a full quiz set by pictures, color and sound only. Parents manage all content in the app. Same code is reused per child (one Supabase project + one deployment, ADR-009).
Out of scope: play limit, cool-down, rest screen, PIN, Spot the Differences, Phaser, full webOS testing (Phase 2).

## 2. Users
- **Child:** no sign-in, read-only access to published content.
- **Parent/admin:** signs in with Supabase Auth email + password (ADR-015), the only writer.

## 3. Child flow (TV 1920x1080, Chromium first, ADR-012)
| ID | Requirement |
|----|-------------|
| C1 | Welcome: large "tap to enter" button. On press: greeting audio plays, background music starts (looping), then "Start game" appears (ADR-016). Princess illustration at the left. Shows the child's name from settings. |
| C2 | Game list: carousel with only "Quiz". Moves with Left/Right keys, click-and-hold drag, arrow buttons, dots. A drag never triggers the card click (ADR-018). Enter/click opens the game. Registry-based so more games can be added later (ADR-014). |
| C3 | Quiz set selection: cards of published sets: cover, name in heading color, optional sub-title, question-count pill, star if finished (ADR-020). Select with click, arrows + Enter. |
| C4 | Question: shows prompt image/text and plays prompt audio if present. 2-3 answers, each an image + number + fixed color (1 rose, 2 sky, 3 butter, ADR-019). Choose by click/tap or keys 1/2/3 (ADR-007). No timer. |
| C5 | Wrong answer: soft "Oh-oh", the wrong card dims gently, child tries again. No penalty, no lives. |
| C6 | Correct answer: "Hooray!" with slow pastel confetti, then a 3 s "Continue in 3s" countdown (click anywhere to skip) moves to the next question (ADR-021). |
| C7 | Set completed screen with praise and a way back to set selection. The set is marked finished (star). |
| C8 | Navigation back (Esc/Back key and a picture button) from set selection to game list and from a question to set selection. |
| C9 | No screen requires reading. Any text is decorative or admin-written. Vietnamese diacritics render correctly (ADR-017). |
| C10 | Motion is slow; `prefers-reduced-motion` disables or reduces confetti and transitions (ADR-006, ADR-021). |
| C11 | Empty state: if there are no published sets, show a friendly picture screen, not an error. |
| C12 | Question screen has three bands (header, question row with image + replay-voice + text, answers) with no overlap (ADR-025). Set-completed screen shows the girl image and a light confetti burst with applause and a spoken "You did it" (ADR-026). |

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
| A8 | Reorder questions. **[assumption]** simple up/down buttons in Phase 1. |

## 5. Data model (Supabase / Postgres) **[assumption: names]**
- `settings` (single row): `child_name text`, `greeting_path text`, `music_path text`.
- `quiz_sets`: `id uuid pk`, `title text not null`, `subtitle text null`, `heading_color text not null default '#5A4038'`, `cover_path text null`, `status text check in ('draft','published') default 'draft'`, `position int`, `created_at`.
- `questions`: `id uuid pk`, `set_id uuid fk on delete cascade`, `position int`, `prompt_text text null`, `prompt_image_path text null`, `prompt_audio_path text null`.
- `answers`: `id uuid pk`, `question_id uuid fk on delete cascade`, `slot int check 1..3`, `image_path text not null`, `is_correct bool`. Unique `(question_id, slot)`; exactly one correct per question (enforced in app + constraint/trigger).
- Storage bucket `media`: public read, write only by admin.
- Progress (star): stored in the browser's localStorage, keyed by set id **[assumption]**; no user identification (ADR-010).
- RLS: anon can `select` settings, published sets and their questions/answers; only authenticated admin can insert/update/delete everything, including drafts and storage writes. Service role key never in the frontend (ADR-015). Schema changes only via migrations (ADR-008).

## 6. Design tokens (from prototype)
Ground `#FBF4E9`, ink `#5A4038`, rose `#E59AA1`/`#F8DCDF`, sky `#8FB3D1`/`#DCE8F1`, butter `#E5C979`/`#F7ECCB`, sage `#9CC3A4`, peach `#F5D9C4`. Fonts: Baloo 2 (child), Nunito (admin), self-hosted.

## 7. Non-functional
- Stack: Next.js + React + TypeScript on Vercel, Supabase backend (ADR-027).
- Chromium latest; avoid very new JS/CSS so the LG webOS browser at least loads it (ADR-012).
- Preload images for the current and next question; app interactive in under 3 s on a home network **[assumption]**.
- Large hit areas: buttons at least 120 px high on the TV screens; visible focus ring for remote navigation.
- Audio manager shared by music, voice and effects; music keeps playing across screens.
- Setup README: a second child's deployment from README only (env vars: Supabase URL + anon key).

## 8. Definition of done (Phase 1)
1. Child goes from Welcome to the end of a set without anyone reading to her.
2. A parent creates a set with at least 5 questions in under 10 minutes.
3. A second child's deployment is set up from the README with no code changes.

## 9. Open questions
- Star progress: localStorage vs database.
- Fallback when no greeting/music is uploaded: silent (proposed).
- Should a finished set be replayable with questions in a fixed order or shuffled? Proposed: fixed order.
