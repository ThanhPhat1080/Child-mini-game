# Design: Sort It (Phase 2, game 3)

Status: **approved by the PO in the brainstorm (2026-10-30); awaiting written-spec review**. Phase 2 only adds games (ADR-029). Order chosen by the PO: Memory Match and Listen & Pick (built), Sort It, then Spot the Differences (own spec later). Each game has its own spec, plan and integration branch (`claude/phase2/sort-it`).

## 1. Goal
Hà My (4-5, cannot read) drags everyday objects into the basket where they belong (animals with animals, food with food) and hears the English word of every object she picks up. Secondary goal: learn English words by hearing them, without pressure.

Success:
1. She plays a full round from the game list to the end with the mouse, nobody reading to her.
2. A parent gives a card a group in under a minute (a field on the card, or a `group` key in the JSON import); the 31 seeded cards already have groups, so the game works on day one.
3. The game is one more registry entry (ADR-014).

## 2. Decisions from the brainstorm
| Topic | Decision |
|---|---|
| Content | The shared card pool (`memory_cards`) plus one new optional field per card: the **group** (stored as `category`). |
| Mode | One fixed mode: 2 baskets, 6 objects (3 per basket). No level screen. |
| Basket hint | Each basket starts with one example card of its group already in it (tap it to hear the word). No group images. |
| Input | Mouse only (Pointer Events, drag and drop). No keyboard play; Esc still goes back. This is a PO decision and the one exception to the child-keyboard rule in CLAUDE.md. |
| Wrong drop | Like Quiz: "Oh-Oh" sound, sad-face popup, the object slides back; no penalty, no timer. |
| Right drop | "Ting ting" chime, the object stays in the basket, the word is said once. |
| Progress | None stored. The finish screen shows how many wrong drops there were (not kept). |
| Tech | React + CSS (DOM) with Pointer Events written in the repo; no drag-and-drop library, no HTML5 drag-and-drop, no Phaser (ADR-030). |
| Name | "Sort It" (English). |

## 3. Requirement IDs
- **G1** (extended): registry entry. **S1-S10**: child side of Sort It. **A14, A15**: admin (group field, JSON import). **A13** (extended): pool health.

| ID | Requirement |
|---|---|
| S1 | Entry: `/games/sort` plays directly (no level screen). Registry entry `sort`, ready, between Listen & Pick and Spot. A "? Sort It" badge opens a "How to play Sort It" popup (opened only from that badge). |
| S2 | Round: two random usable groups; from each, 4 random cards: 1 is the example already in the basket, 3 are objects to sort. The 6 objects are shuffled in one row; which basket is left or right is random. No usable pair of groups: friendly picture screen, not an error. |
| S3 | Drag: pressing an object (primary button) lifts it (slightly larger, soft shadow), it follows the pointer, and the word is said (recorded file if the card has one, else `speakKid`). Releasing over a basket counts as a drop on that basket (the basket area, not only its slots). A press without movement is a tap: the word is said again and the object stays. Only one object is dragged at a time. |
| S4 | Right drop: "ting ting" (`chime`), the object settles into the next free slot of that basket, then the word is said once. |
| S5 | Wrong drop: `ohOh` sound, a non-blocking "Oh-oh… try again!" popup with the sad face (the same look as Quiz, 1.4 s), the object slides back to its place in the row. The wrong count goes up by one. Releasing outside both baskets: the object slides back, no sound, no count. |
| S6 | Voice: picking an object up, tapping an example or an object, and a right drop each say the word through `sayWord`; a newer word cuts the older one. |
| S7 | Finish: after the 6th right drop and its word (about 1 s pause) the shared celebration scene shows (3 stars, both characters, confetti, "You did it, <child name>!" with the same praise sound as the other games), the line "Wrong N times" with N highlighted (N may be 0), and two picture buttons: play again (a new round) and back to games. Nothing is stored. |
| S8 | Reduced motion: no lift animation, no slide or bounce; the object jumps back and the popup just appears. Sounds stay. |
| S9 | Robustness: a missing picture shows a plain placeholder and the object is still draggable; no English voice means no spoken word, the game still works; leaving the page cancels timers and speech and drops any drag in progress; the pointer leaving the window or `pointercancel` slides the object back; a second press during a slide-back or a right-drop settle is ignored; the round's pictures are preloaded. |
| S10 | Keys and focus: Esc goes to `/games`; every object, example and button is a real element with a visible focus ring, but dragging needs the mouse (see the decision above). |
| A14 | Group field: on `/admin/cards` each card has a "Group" text field (free text with suggestions from the groups in use). Saved with the card; a warning (not a block) shows for a group that has fewer than 4 cards. |
| A15 | JSON import: each card in the import file may have `group` (optional string). Validation: after trim, 1-40 characters; wrong type or too long is an error with the card number (same rules and "nothing is imported on any error" as A12). `public/memory-cards-template.json` shows the key. |
| A13 | (extended) Pool health also says how many groups are usable for Sort It, for example "Sort It: 6 groups can be played (2 are needed, each with 4 cards)". |

## 4. Data
One new migration `supabase/migrations/20261030100000_memory_cards_category.sql`:
- `alter table memory_cards add column category text null`, with a check that it is null or 1 to 40 characters after trim.
- It sets the group of the seeded cards by word (the seeded picture paths start with `seed/`):

| Group | Cards |
|---|---|
| `food` | apple, banana, berry, grapes, cookie |
| `animals` | bird, cat, duck, fish |
| `shapes` | circle, heart, square, star, triangle |
| `school` | ruler, pencil, pen, eraser, book, scissors, backpack |
| `home` | cup, chair, clock, house |
| `nature` | flower, moon, sun, tree |
| (none) | ball, car |

- RLS does not change: anon still reads active cards only, only the admin writes. Other games ignore the column.
- A group key is `category` trimmed and lowercased everywhere (the admin saves it that way). Display needs no label: the child sees pictures, the parent sees the key.
- A group is **usable** when it has at least 4 active cards with different words (same-word cards count once, as in Listen & Pick). Cards without a group are ignored by this game. The game needs at least 2 usable groups.

## 5. Child screen, `/games/sort`
Layout on the 1920x1080 stage: header with back button and the "? Sort It" badge; two large baskets left and right (each a rounded tray with its example already inside and three empty slots); the row of 6 objects at the bottom centre. Music button as in the other games.

- Pointer handling: the page converts pointer positions to stage coordinates using the stage scale, so dragging and the drop test work at any window size. The drop test uses the basket's rectangle on screen.
- Right drops lock the object in its slot (it is no longer draggable). Wrong drops and outside drops return the object to its place in the row (about 0.35 s, none under reduced motion).
- Colors: baskets use a warm butter tone so the game differs from Quiz (rose), Memory Match (sage), Listen & Pick (lavender) and Spot (sky). Proposed values: card border `#EAD9A0`, title and icon ring `#A8842F`, icon circle `#FBF3D9`; the PO confirms from a screenshot at the end.
- The game list card shows a decorative icon (not a button, `aria-hidden`) like the other games: two small baskets with a star and a heart.
- The help popup (`SortHelp`, shell `GameHelp`) has 3 steps: pick up an object and hear it, drag it to the basket with the same kind of things, a happy sound when it fits.

## 6. Admin
- `components/admin/CardPanel` gets the Group field (input with a `datalist` of existing groups). `ECard` in `lib/memory/adminCards.ts` gets `category`; `saveCards` writes it; Revert and the completeness rules do not change (a group is optional).
- `lib/memory/import.ts` parses and validates `group` as in A15 and maps it to `category`.
- Pool health text (A13) is computed by a pure helper (`usableGroups(cards)`, shared with the game's round builder).

## 7. Architecture notes
- New pure units: `lib/sort/groups.ts` (`usableGroups(cards)`) and `lib/sort/rounds.ts` (`buildSortRound(cards, rng?)`); `lib/sort/drag.ts` (pure helpers: stage-coordinate conversion, point-in-rect hit test).
- UI: `app/games/sort/page.tsx`, `components/sort/*` (basket, draggable object, finish content), `components/SortHelp.tsx`.
- Reuses: `fetchActiveCards` (the select gains `category`; `MemoryCard` gets `category: string | null`), `sayWord`/`stopWord`, `chime`, `ohOh`, `Stage`, `Hills`, `BackButton`, `MusicButton`, `CelebrationScene`, `GameHelp`, `preloadImages`, the sad-face popup markup of Quiz.
- The other games and their tests must keep passing (the extra column is additive).

## 8. Testing
- Unit: `usableGroups` and `buildSortRound` (counts, no repeated cards, two different groups, 1 example + 3 objects each, shuffles, same-word cards count once, fewer than 2 usable groups gives `null`); drag helpers (scale conversion, hit test); import (`group` valid, wrong type, over 40, blank); the template file; admin save of `category`; sfx calls.
- Component: round start, pointer drag with right drop (chime, word, slot filled), wrong drop (ohOh, popup, slide back, count), drop outside, tap without movement, `pointercancel`, a second press during a slide-back, finish with 0 and some wrong drops, empty screen, help popup, reduced motion, unmount cleanup (no timers left).
- Database: the migration applies on top of the existing ones; seeded cards have the groups of the table above; anon still reads only active cards.
- E2E (Playwright, real mouse with `page.mouse` on the stand-in Supabase): a full round with right drops; a wrong drop then the right one; a drop outside; the finish count; play again; empty pool screen; admin: set a group on a card and save; import a file with `group`.
- By hand (PO): how the drag, sounds and voice feel.

## 9. Out of scope
Keyboard play, per-group pictures, levels or more than 2 baskets, stored progress or a list of mixed-up words, group management pages (renaming a group across all cards), Phaser, Spot the Differences (its own spec).
