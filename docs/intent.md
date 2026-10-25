# Intent: Kid-Friendly Interactive Web Gaming Hub & Parental Control System

## 1. Overview & Vision
A personalized, safe, web-based gaming platform built specifically for a 4-5-year-old child (Hà My) who cannot yet read. The application runs directly on Smart TV browsers (LG webOS, Samsung, Sony) via TV remote controls, combining a friendly, customized UI with strict digital wellbeing controls (time-boxing and parental lock) to prevent screen addiction and exposure to toxic content.

## 2. Target Audience & Personas & Creator Philosophy
* **Primary User (The Child):** Hà My (4-5 years old). Needs ultra-simplified UI ("Mega Buttons"), large touch/remote hit areas, visual/auditory feedback (anime princess graphics, personalized audio greetings), and zero negative reinforcement (no punishment for wrong answers).
* **Secondary User (The Parent):** Looking for a secure, controlled environment to let the child play safely for limited durations with automated guardrails.
* **Creator Philosophy (Calm & Slow Gaming):** Inspired by the innocent, straightforward nature of 8x/9x retro games, the webapp strictly avoids over-hyped, flashy, high-stimulation elements (such as neon colors, rapid jarring animations, and loud sensory overload). The goal is to cultivate a **calm, focused, and stress-free cognitive environment** that prevents unwanted hyperactivity and screen fatigue.

## 3. Core Functional Requirements & Aesthetic Principles
* **Personalized Onboarding:** Load custom anime princess artwork, user avatar, and an automated voice greeting ("Hà My ơi...") fetched from Supabase storage upon initial page load.
* **Aesthetic & Sensory Design (Ghibli & Minimalist Style in 2D):**
  * **Color Palette:** Desaturated, warm pastel tones (soft warm cream, muted pinks, soft peach, gentle yellows) avoiding high-saturation neon glare to protect eyes and maintain deep focus.
  * **Audio Experience:** Continuous, gentle, lofi/acoustic instrumental background music (Studio Ghibli style) with soft, comforting feedback sounds (gentle "Hooray" with slow pastel confetti, mild "Oh-oh" for wrong attempts without harsh penalties).
* **Intuitive Remote Control Mapping:** Designed for effortless interaction via TV mouse/Magic Remote and direct **Number Pad shortcuts** on the remote (e.g., pressing `1`, `2`, `3` to answer questions instantly).
* **Session Management & Digital Wellbeing (Phase 2):**
  * **Play Limit:** Maximum 1 hour of continuous gameplay per session.
  * **Cool-down Period:** Mandatory 3-hour rest interval between sessions.
  * **Graceful Lock Screen:** When time expires, an animated princess gently appears to guide the child to rest, accompanied by a parental override PIN pad.
* **Parental Override (King Arthur's PIN) (Phase 2):** A 4-digit PIN input screen requiring authentication from "King Arthur" to instantly reset the session lock.
* **Extensible Mini-Game Hub (Spot the Differences is Phase 2):** A modular architecture built with Phaser.js allowing seamless expansion of new mini-games (starting with "Spot the Differences").

## 4. Technical Architecture & Tech Stack
* **Frontend Hub & Shell:** Next.js + React + TypeScript (see ADR-027; DOM/CSS for the Phase 1 quiz, see ADR-014) for managing routing, splash screens, and TV browser integration.
* **Game Engine:** Phaser.js 2D for lightweight, high-performance canvas rendering optimized for Smart TV performance constraints (webOS/Tizen).
* **Backend & Database:** Supabase (Postgres, Storage, Auth; Firebase is not used, see ADR-008) for storing child profile metadata, session timers, state checkpoints, and dynamic mini-game content (JSON-driven levels).
* **Deployment & Delivery:** Web-based deployment (Vercel/Netlify), accessed via TV browser bookmarks or shortcuts.

## Phasing (updated 2026-10-25)

### Phase 1: MVP (build first)

**Goal:** Hà My can finish a full quiz set with images. Parents update the content themselves without touching code.

**In scope:**

- **Welcome screen**: a large "tap to enter" button (so the browser allows audio to play), a greeting sound, background music uploaded by the parent, and a "Start game" button.
- **Game list**: shows only the Quiz game. The structure is ready for more games in Phase 2.
- **Quiz**: the child picks a quiz set and answers one question at a time. Each of the 2-3 answers is an image with a number and a color (mouse or Magic Remote, or keys 1-3). A correct answer gets praise and a gentle effect. A wrong answer lets the child try again. No penalty, no timer.
- **Admin dashboard** (parent signs in): upload the greeting and background music, enter the child's name, create and edit quiz sets, and add questions with image answers and optional question audio.
- **Reuse for other children**: same source code, one Supabase project and one deployment URL per child. Only environment variables change. Set up an admin and enter content by following the setup README.
- **Platform:** web on Chromium. Test by casting a MacBook to the TV and using a mouse. Open the URL once in the LG webOS browser to catch major problems early.

**Out of scope for Phase 1:** play-time limit, cool-down, rest screen, PIN, Spot the Differences, full testing on webOS with the real remote.

**Definition of done (proposed, adjust as needed):**

- The child goes from Welcome to the end of a quiz set without anyone reading text to her.
- A parent creates a new quiz set (at least 5 questions) in under 10 minutes.
- A second child's deployment can be set up from the README alone, without code changes.

### Phase 2

- Play-time limit of 1 hour and a mandatory 3-hour rest. Timestamps are stored on the server (one session row, no user identification).
- Rest screen with a princess, and a 4-digit PIN to unlock it for parents (checked on the server, stored as a hash).
- Spot the Differences game (Phaser.js, levels stored as JSON, a tool to pick hotspot coordinates).
- LG webOS compatibility: test with the real Magic Remote and number keys.

### Design constraints (input for Claude Design)

- The child is 4-5 and cannot read yet, so no screen requires reading. All navigation uses pictures, color, and sound.
- Keep the pastel palette and the "Calm & Slow Gaming" feel described above.
- TV screen at 1920x1080: large buttons and tap targets, generous spacing.
- Screens to mock for Phase 1: Welcome, Game list, Quiz set selection, Question, Correct/wrong feedback, Set completed, and four admin pages (sign-in, settings, quiz set list, question editor).

## Design outcomes from the prototype (2026-10-25)

The Phase 1 prototype (Claude Design canvas, 12 boards) is approved by the owner. Details: `spec.md`. Prototype: https://claude.ai/artifact/L1YRtj4NVFe6NewZ3w2s4E

- **Welcome:** keeps the layout, adds a 2D anime chibi princess (left side) waving. Tap to enter, then greeting, then Start.
- **Language and fonts:** UI must support Vietnamese and English. Child UI uses Baloo 2, admin uses Nunito. No Vietnamese text is hard-coded in the child UI; wording shown to the child is decided by the admin.
- **Game list:** a carousel. Remote Left/Right keys, mouse click-and-hold drag, arrow buttons and dots all move it.
- **Quiz set selection:** each set shows cover image, name (in the set's heading color), optional admin sub-title, a question-count pill and a star when finished, so the child and parent can choose without reading.
- **Question:** 2-3 picture answers, each with a number and a fixed color by position (1 rose, 2 sky, 3 butter). Separate states: question, wrong (gentle retry), correct (slow pastel confetti "Hooray!").
- **Admin:** sign-in, settings, quiz set list with a live preview of how each set looks on the front page, set editor (name, sub-title, heading color presets plus custom picker, cover with preview, questions), add-question flow with a completeness checklist, delete set / delete question with a confirmation popup, and "Preview as child" that works on a saved draft without publishing.
- **Question image:** each question can show a picture above the answers (4:3 frame, image fitted not cropped). The admin question editor has an upload field with limits: PNG/JPG/WebP, up to 2 MB, best at 1200x900 px.
- **Layout (Question):** three bands, header, question row (image + replay-voice button + text), answers. Nothing overlaps.
- **Set completed:** 2D chibi girl with a camera (left side) and a large Hooray confetti burst, same effect as the correct-answer screen but denser. No party horns.
- **Motion:** slow; respects `prefers-reduced-motion`.

## Open questions

- Is "finished set" progress (star badge) kept per browser (localStorage) or in the database? Proposed: localStorage in Phase 1 (no user identification, ADR-010).
- ~~App framework: Vite + React vs Next.js.~~ Decided 2026-10-26: Next.js + React + TypeScript (ADR-027).
