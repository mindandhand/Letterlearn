# Letterlearn

[中文文档](README.zh.md)

A bright, no-ads keyboard game that teaches 4–5 year-olds the English alphabet:
recognizing A–Z, telling uppercase from lowercase, finding letters on a real
keyboard, and hearing correct pronunciation — all backed by a local high-five,
never a penalty.

Runs entirely in the browser. No backend, no accounts, no analytics, no child
data ever leaves the device — everything is stored in `localStorage`.

## Screenshots

| Home | Free Play | Find the Letter |
|------|-----------|-----------------|
| ![Home screen showing four game mode cards](docs/screenshots/home.png) | ![Free Play mode showing the letter F and the word Fish](docs/screenshots/game-freeplay.png) | ![Find the Letter mode showing the letter A waiting for input](docs/screenshots/game-find-letter.png) |

## Quick start

```bash
npm install
npm run dev       # starts the Vite dev server, prints a local URL
```

## Build

```bash
npm run build      # tsc -b (type-check) then vite build → dist/
npm run preview    # serve the production build locally
```

## Test

```bash
npm run test        # runs the full suite once (vitest run)
npm run test:watch  # watch mode
```

Tests use Vitest + React Testing Library + jsdom. See [Testing](#testing) below
for what's covered.

## Implemented features

- **Four game modes**, each independently playable from the mode-select screen:
  - **Free Play** — press any letter, hear it, see its word and emoji.
  - **Find the Letter** — hear "Press A", find it on the keyboard; gentle retry
    on a miss, no penalty.
  - **Listen and Find** — the letter is hidden; listen (with a repeat button)
    and press what you heard.
  - **Case Match** — match `A` with `a`; practice uppercase-only,
    lowercase-only, or mixed.
- **Full A–Z letter data** with a child-friendly word, emoji, and audio slug
  for each letter (`src/data/letters.ts`).
- **Pre-recorded pronunciation** for every letter, word, prompt, and
  uppercase/lowercase pairing, in both US and GB accents — see
  [Pronunciation system](#pronunciation-system) below.
- **Sound settings**: master switch, letter speech, word speech, sound
  effects, background music (ducks under speech, muted until first
  interaction), volume, accent, and a "Test sound" button.
- **8 encouragement phrases** and **6 celebration animations** (confetti,
  stars, rainbow, balloons, dancing mascot, sticker), all `prefers-reduced-motion`
  aware, plus a live streak counter ("3 in a row!").
- **4 visual themes** (Rainbow Land, Space Adventure, Animal Forest, Ocean
  World), switchable from the welcome screen or parent settings, persisted
  locally.
- **Parent settings**, gated behind a simple arithmetic question so a child
  can't wander in by accident: practice mode, letter case, letter range
  (presets + custom picks), questions per round (5/10/15/unlimited), auto-advance
  on/off + delay, show word/emoji toggles, reduced-motion toggle, sound
  settings, theme, and a "Clear learning record" reset.
- **Local learning record** per letter (attempts, correct, mistakes, current
  streak, best streak, last practiced) shown as a simple star grid
  (needs practice / improving / familiar) — no charts.
- **Weighted, non-repeating letter selection**: never repeats the letter just
  asked, leans toward letters the child recently missed, eases off ones on a
  streak.
- **Keyboard handling** built for a 4–5 year-old at a real keyboard: ignores
  held-key repeats, modifier combos, and typing into form fields; case is
  normalized so Caps Lock never matters; the listener is fully detached
  (not just ignored) while the settings panel is open.
- **Accessibility**: large targets, visible focus states, `aria-live`
  announcements for results (no repeat spam), no color-only signaling, no
  countdowns, no failure states.

## Known limitations / browser notes

- Letter and word audio clips are synthesized once at build time via macOS
  `say` (see below) — they are natural-sounding TTS, not real human studio
  recordings. Swap in real recordings by replacing the files in
  `public/audio/{us,gb}/` with same-named `.m4a` files (or edit `AUDIO_BASE`
  in `audioService.ts` to point elsewhere).
- If a clip fails to load (e.g. a missing file, or you deploy without the
  `public/audio` folder), the game automatically falls back to the browser's
  `SpeechSynthesis` API. Voice availability and quality vary by browser/OS in
  that fallback path; some browsers may have no installed voices at all, in
  which case the game silently continues with no audio rather than blocking
  play.
- Autoplay policies mean background music never starts on page load — it
  waits for the first click or key press, per browser requirements.
- Designed and tested for desktop/tablet screens with a physical keyboard;
  there's no on-screen keyboard or touch-only input path for phones.
- Tested primarily in Chromium-based browsers during development; Safari's
  `AudioContext` requires the `webkitAudioContext` fallback already present
  in `audioService.ts`.

## Architecture & state management

No routing library — `App.tsx` holds a single `page` state
(`"welcome" | "game"`) and swaps top-level page components.
Two pieces of persistent state live at the top and are threaded down as
props: `useSettings()` (all `GameSettings`, backed by `useLocalStorage`) and
`useProgress()` (per-letter `LetterProgress`, backed by `services/progressService.ts`).

Each game mode is driven by one state machine, `useGameSession` (in
`hooks/useGameSession.ts`), moving through:

```
idle → presenting → waitingForInput → correctFeedback | incorrectFeedback
     → showingWord → celebration → nextQuestion → (presenting...)
```

A `generation` counter invalidates in-flight async work (audio promises,
timers) whenever the mode changes or the hook unmounts, so a stale callback
can never resurrect a finished question. A `hasScoredRef` guard ensures a
question is only ever recorded once, even if answered eagerly while the
prompt audio is still playing.

```
src/
  components/   LetterDisplay, WordCard, ModeCard, CelebrationLayer,
                SoundControls, ThemeSelector, ParentSettings (+ ParentGate),
                ProgressStars
  pages/        WelcomePage, GamePage
  hooks/        useKeyboardInput, useSpeech, useGameSession,
                useLocalStorage, useSettings, useProgress
  services/     audioService (playback), progressService (localStorage I/O)
  data/         letters, themes, encouragements, defaultSettings
  types/        game.ts (GameSettings, LetterProgress, QuestionPhase, ...)
  utils/        random, wait, letterSelection (weighted picker)
  styles/       tokens.css (design tokens), global.css
```

`useKeyboardInput` fully removes its `keydown` listener (rather than just
ignoring events) whenever `enabled` is false — used to pause the game while
the parent settings modal is open — and cleans up on unmount, so switching
pages or modes never accumulates duplicate listeners.

## Pronunciation system

`services/audioService.ts` plays pre-recorded `.m4a` clips from
`public/audio/{us,gb}/` for every letter, word, "Press X" prompt, and
uppercase/lowercase pairing phrase. These are generated once by
`scripts/generate-audio.sh`, which uses the macOS `say` command plus
`afconvert` to render each phrase for both accents and commits the output as
static assets — so the shipped app never depends on the browser's live
`SpeechSynthesis` API for its core content.

`SpeechSynthesis` is kept only as an automatic fallback: if a clip's
`<audio>` element fails to load or play (missing file, unsupported format,
autoplay block), `audioService` transparently retries with a synthesized
utterance using the same text. If the browser has no speech synthesis
support at all, that fallback resolves immediately and the game continues
silently — sound is always additive, never a blocker to play.

Playback is serialized: starting a new clip or utterance cancels whatever
was still playing (a monotonic token guards against a slow-finishing old
callback stomping on a newer one), so rapid key presses never overlap two
voices. Background music, when enabled, automatically ducks its volume
while any speech or clip is playing and restores it afterward.

To regenerate the audio (e.g. after adding a new word), run on macOS:

```bash
./scripts/generate-audio.sh
```

## Testing

Twelve scenarios called out in the project spec are covered:

| # | Scenario | Test file |
|---|----------|-----------|
| 1 | Correct key press triggers success | `hooks/useGameSession.test.ts` |
| 2 | Wrong key doesn't advance the question | `hooks/useGameSession.test.ts` |
| 3 | Non-letter keys are ignored | `hooks/useKeyboardInput.test.ts` |
| 4 | Caps Lock doesn't affect answer matching | `hooks/useKeyboardInput.test.ts` |
| 5 | Free Play shows the pressed letter | `hooks/useGameSession.test.ts` |
| 6 | No speech calls when sound is off | `hooks/useSpeech.test.ts` |
| 7 | Settings read/write to localStorage | `hooks/useLocalStorage.test.ts` |
| 8 | Letter picker never repeats consecutively | `utils/letterSelection.test.ts` |
| 9 | Opening settings pauses game keyboard input | `pages/GamePage/GamePage.test.tsx` |
| 10 | Auto-advance after celebration/timer | `hooks/useGameSession.test.ts` |
| 11 | Keyboard listener cleaned up on unmount | `hooks/useKeyboardInput.test.ts` |
| 12 | Single-letter custom range doesn't hang | `utils/letterSelection.test.ts`, `hooks/useGameSession.test.ts` |

Audio playback is mocked (`services/audioService`) in every test that
exercises game logic, so the suite never touches real `<audio>` elements or
`SpeechSynthesis`, and runs deterministically offline.

## Extending the game

**Add a new theme** — add an entry to `THEMES` in `src/data/themes.ts`
(`id`, `name`, `description`, `icon`, `decorations`, `celebrationIcon`), then
add matching CSS for `[data-theme="your-id"]` in the component stylesheets
that reference theme colors (`styles/tokens.css` and the page/component CSS
files). The new theme automatically appears in `ThemeSelector` and persists
via settings once picked.

**Add a new celebration animation** — add its id to `CelebrationAnimationId`
and `CELEBRATION_ANIMATIONS` in `src/data/encouragements.ts`, then add a
matching `{animation === "your-id" && (...)}` branch in
`components/CelebrationLayer/CelebrationLayer.tsx` using Framer Motion,
including a `reducedMotion` fallback.

**Add or change a letter's word/emoji** — edit its entry in `LETTERS` in
`src/data/letters.ts`. Keep `audioSlug` a filename-safe, lowercase, hyphenated
slug — then add matching `word-{audioSlug}.m4a` files to
`public/audio/us/` and `public/audio/gb/` (regenerate via
`scripts/generate-audio.sh`, or drop in real recordings with the same
filenames).
