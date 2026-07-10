# Letterlearn — Progress Audit

Last updated: 2026-07-10 14:24 (auto-maintained during this session)

**Status: gap-fill complete.** Tests and README (the two confirmed gaps) are
now done; see "Session update" at the bottom for what changed since the
initial audit below.

This tracks the existing codebase against the full children's-ABC-keyboard-game spec.
The project is **not built from scratch this session** — it already implements the
large majority of the spec. This doc records what's verified DONE, what's PARTIAL,
and what's MISSING, so remaining work is additive and surgical rather than a rewrite.

Legend: ✅ DONE  🟡 PARTIAL  ❌ MISSING

## Build & tooling
- ✅ `npm run build` (tsc -b && vite build) passes with zero errors, 457 modules, ~111kB gzip JS
- ✅ React 19 + TypeScript + Vite 8 + Framer Motion, no backend, no paid APIs
- ❌ **No test files exist anywhere** (`src/test/` dir is empty, no `*.test.ts(x)` in repo) despite vitest + @testing-library/react + jest-dom + user-event all installed as devDependencies
- ❌ **No `test` script in package.json** — vitest isn't wired to `npm test`/`npm run test`
- ❌ **README.md is still the default Vite scaffold template** — no install/run/build/test docs, no feature list, no architecture notes, no pronunciation-system explanation, no "how to add a theme/letter" guide

## Core modes (all 4 implemented in `useGameSession.ts` + `GamePage.tsx`)
- ✅ find-letter: prompts "Press X" via audio, zoom/shake feedback, word+emoji+word audio, encouragement, auto-advance (`useGameSession.ts:86-99,101-152`)
- ✅ free-play: shows pressed letter, plays letter+word audio, non-letter keys already filtered upstream in `useKeyboardInput` (`useGameSession.ts:171-194`)
- ✅ listen-and-find: letter hidden until answered (`GamePage.tsx:47`), "Listen again" button (`GamePage.tsx:126-129`)
- ✅ case-match: shows "A a" pairing, plays pair sound via `audioService.playPairSound` (`GamePage.tsx:118-123`, `audioService.ts:124-132`)
- ✅ case sub-modes uppercase/lowercase/mixed via `pickIsUppercase` (`letterSelection.ts:56-64`)

## Letter data
- ✅ A–Z complete in `data/letters.ts`, matches suggested word list exactly, each word genuinely starts with its letter, includes `audioSlug` + bonus `sentence` field per letter

## Sound system
- ✅ Pre-generated `.m4a` audio (214 files: letters/words/prompts/pairs × us/gb) via `scripts/generate-audio.sh` (macOS `say` + `afconvert`) — **not** live Web Speech API as primary; speechSynthesis is fallback-only on clip load/play failure
- ✅ Master/letter/word/effects/music toggles + volume + accent selector + "Test sound" button (`SoundControls.tsx`)
- ✅ Music ducks during speech (`audioService.ts:279-289`), only one clip/utterance plays at a time (`playToken`/`speechToken` generation counters cancel stale ones), settings persisted via `useLocalStorage`
- ✅ No autoplay before first interaction — music only starts after first `pointerdown`/`keydown` (`App.tsx:24-40`)
- 🟡 Voice quality is synthetic (macOS `say`), not real human recordings — spec allows either but flagged for awareness (see prior conversation)

## Encouragement & animation
- ✅ 8 encouragement phrases (`data/encouragements.ts:1-10`), matches spec list exactly
- ✅ 6 celebration animations: confetti, stars, rainbow, balloons, dancing-animal, sticker (`CelebrationLayer.tsx`)
- ✅ ~1–2s durations, non-blocking, `reducedMotion` prop collapses each animation to simple opacity fade
- ✅ Streak counter "N in a row!" shown when streak ≥ 3 (`CelebrationLayer.tsx:47,139-148`)
- ✅ No failure/penalty mechanics anywhere in `useGameSession.ts`

## Visual themes
- ✅ 4 themes: Rainbow Land, Space Adventure, Animal Forest, Ocean World (`data/themes.ts`), each with distinct decorations + celebration icon
- ✅ Theme persisted via settings → localStorage, applied via `data-theme` attribute on `<html>` (`App.tsx:20-22`)
- ✅ `clamp()` sizing and `prefers-reduced-motion` present in `styles/tokens.css` / `global.css`; `:focus-visible` states present

## Pages
- ✅ WelcomePage: title, subtitle, big start button, sound toggle, theme preview, parent-settings entry (`⚙️ Parents` link)
- ✅ ModeSelectPage: 4 cards with icon/title/description/CTA
- ✅ GamePage: back button, mode label, streak stars, sound toggle, settings button, central letter, word/emoji card, celebration layer, replay button (listen mode), next button on `nextQuestion` phase
- ✅ ParentSettings gated by `ParentGate` — simple multiplication question with 3 shuffled options, "Cancel" escape hatch, re-generated each time it's opened (prevents a curious child memorizing one answer)

## Letter range & selection algorithm
- ✅ A-Z / A-F / G-L / M-R / S-Z presets + custom per-letter checkboxes (`ParentSettings.tsx:21-27,165-176`), UI prevents dropping to zero enabled letters
- ✅ Weighted random selection: avoids immediate repeat, upweights recently-missed letters (+3), downweights letters on a ≥3 streak (`letterSelection.ts`)
- ✅ Single-enabled-letter case returns immediately, no loop risk (`letterSelection.ts:36-38`)
- 🟡 "Weight gradually returns to normal after several correct rounds" is spec'd as an explicit decay — current implementation is recomputed per-question from live progress stats (mistakes/streak), which self-corrects but isn't a literal timed decay. Functionally close enough; documented as a design choice, not a bug.

## Progress tracking
- ✅ `LetterProgress` shape matches spec exactly, stored under `letter-learn:progress` (`progressService.ts`)
- ✅ Parent panel shows most-missed letters + per-letter mastery grid (new/learning/familiar, star icons, no charts) (`ProgressStars.tsx`, `ParentSettings.tsx:260-269`)
- ✅ "Clear learning record" button with confirm() guard

## Keyboard handling (`useKeyboardInput.ts`)
- ✅ keydown-based, `event.repeat` filtered, Ctrl/Alt/Meta filtered (Shift intentionally allowed through since it's needed for nothing here — letters are case-normalized), ignores focus on INPUT/TEXTAREA/SELECT, `event.key.toLowerCase()` for caps-lock independence, listener removed entirely when `enabled=false` (settings modal open) and re-attached on close, cleanup on unmount via returned function
- ✅ No duplicate listeners across mode switches — `useGameSession`'s `restart()` runs off `settings.mode` dependency only, `useKeyboardInput`'s effect keys off `enabled` only

## Accessibility
- ✅ `aria-live="polite"` region for phase announcements without duplicate spam (`GamePage.tsx:49-54,152-154`), `role="dialog" aria-modal` on settings/gate, `role="radiogroup"` on theme selector, `aria-label`s on icon buttons, visually-hidden helper text on empty letter display
- ✅ No countdown pressure, no failure penalty, color not sole signal (shake + hint text + audio accompany incorrect state)

## Outstanding gaps (ranked by centrality to spec's acceptance criteria)
1. ❌ **Zero automated tests** — spec explicitly requires 12 named test scenarios; devDependencies are installed but unused. This is the biggest gap.
2. ❌ **No `test` npm script** — even if tests existed, there's no wired entrypoint.
3. ❌ **README is the unmodified Vite template** — none of items 18.3–18.10 (run/build/test docs, feature list, known limitations, architecture, pronunciation system, extension guide) are documented.
4. 🟡 Minor: weight-decay-over-time is implicit rather than literal; audio voices are synthetic TTS, not human recordings (both acceptable per spec wording, just worth flagging).

## Next steps (proposed order) — historical, see Session update below
1. ✅ Add `"test": "vitest run"` (+ `"test:watch": "vitest"`) to package.json, wire up `vitest.config`/setupTests if missing.
2. ✅ Write the 12 spec'd test scenarios across `useKeyboardInput`, `useGameSession`/reducer logic, `letterSelection`, `useLocalStorage`/`useSettings`, `useProgress`.
3. ✅ Run `npx vitest run`, fix failures.
4. ✅ Rewrite README.md with real project docs (install/build/test, feature list, architecture, audio system + fallback, extension guide).
5. ✅ Re-run `npm run build` + tests as a final gate.

## Session update — 2026-07-10 14:24

Implemented the two confirmed gaps from the initial audit:

**Testing infrastructure**
- `vite.config.ts` now imports `defineConfig` from `vitest/config` and adds a `test` block (`environment: jsdom`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`)
- `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` (auto-extends `expect` + types the matchers against vitest's `Assertion` interface — no manual type augmentation needed)
- `tsconfig.app.json` types array extended with `vitest/globals` so `describe`/`it`/`expect` resolve without per-file imports
- `package.json`: added `"test": "vitest run"` and `"test:watch": "vitest"`

**6 test files, 28 tests, all passing, mapped 1:1 to the spec's 12 scenarios** (see README's Testing section for the full table):
- `src/utils/letterSelection.test.ts` — no-repeat picking, single-letter no-hang, empty-array throws, mistake-weighting (via `Math.random` spy), `pickIsUppercase` per case mode
- `src/hooks/useLocalStorage.test.ts` — init from storage, default fallback, write-through, functional updates
- `src/hooks/useKeyboardInput.test.ts` — letter normalization, non-letter/modifier/repeat filtering, Caps-Lock independence, `enabled=false` no-op, unmount cleanup, no duplicate listeners on same-state rerender
- `src/hooks/useSpeech.test.ts` — audioService called when sound on; **not** called when master sound or letter-speech is off (mocks `services/audioService`)
- `src/hooks/useGameSession.test.ts` — correct-answer scoring, incorrect-answer retains question, free-play shows pressed letter immediately, auto-advance after celebration + delay, single-enabled-letter doesn't hang (mocks `services/audioService`, uses real timers + `waitFor` rather than fake timers, since the celebration/incorrect-reset delays are internal constants not exposed via settings)
- `src/pages/GamePage/GamePage.test.tsx` — integration test confirming keydown is ignored while the parent-settings dialog is open and resumes after close

Verified: `npm run build` (tsc -b + vite build) clean, `npx vitest run` 28/28 green, `npm run lint` shows only one **pre-existing** warning unrelated to this work (`useGameSession.ts:182` missing `isStale` dep — not touched this session, left as-is per surgical-changes policy).

**README.md** rewritten from the default Vite template to cover: quick start, build, test, full implemented-features list, known limitations/browser notes, architecture + state machine diagram + directory map, pronunciation system and its fallback strategy, and step-by-step guides for adding a theme / celebration animation / letter+word.

**Remaining known items** (unchanged from initial audit, not blocking):
- Audio voices are synthetic TTS (macOS `say`), not human recordings — documented as swappable in README's Known Limitations.
- Weighted letter selection's "decay back to normal over time" is implicit (recomputed from live stats each pick) rather than a literal timed decay — functionally equivalent, documented as a design choice.

## Session update — 2026-07-10 15:37 — manual browser verification

Ran `npm run dev`, drove the real app with a headless-Chromium Playwright
script (no `chromium-cli` available in this environment, so used the
Playwright JS API directly per the `run` skill's fallback pattern),
screenshotted every major surface, and read each screenshot back. This is
the browser-level check that unit/integration tests under jsdom can't
substitute for.

**Verified visually correct:** welcome screen, all 4 themes (Rainbow Land /
Space Adventure / Animal Forest / Ocean World — distinct backgrounds,
decorations, and accent colors, active-theme ring visible), mode-select
cards, Free Play flow (press key → letter + word + emoji + confetti),
Find the Letter flow (prompt → correct-answer green ring + word reveal),
incorrect-answer feedback (orange ring + "You can do it!", no color-only
signaling since text also changes), the parent-settings math gate (renders,
focus ring visible on the close button), and keyboard-input pausing while
the settings dialog is open (verified: keydown while dialog open produced
no change; closing it and pressing the same key worked immediately after).
Zero browser console errors across the whole run.

**Bug found and fixed:** `useGameSession.ts`'s `handleIncorrect` schedules a
`setTimeout` to reset the phase back to `"waitingForInput"` 700ms after a
wrong answer. That timer was only guarded against a mode/unmount change
(`isStale`), not against a *correct* answer landing in the meantime. Repro:
press a wrong letter, then press the right one ~300ms later (well within a
4-5-year-old's plausible retry speed) — the correct-answer celebration
(green ring, word card, `A a` case-pairing) would flash for the first
~50-300ms, then the stale timer fired at the 700ms mark and blanked the
screen back to a plain unstyled box for roughly a second, before the
celebration reappeared once the pairing/word audio promise resolved.
Confirmed via a scripted repro sampling `letter-display` class + case-pair
presence at 8 timestamps — the blank window was reproducible on every run
before the fix and gone on every run after.

**Fix** (`src/hooks/useGameSession.ts:163-169`): the timer now also checks
`hasScoredRef.current` (set synchronously the instant a correct answer is
recorded) before resetting the phase, so a correct answer that supersedes a
recent miss can no longer be clobbered.

**Regression test added:** `src/hooks/useGameSession.test.ts` — "does not
let a late incorrect-answer reset timer erase a correct answer submitted
shortly after" — submits wrong then correct ~300ms apart and polls the
phase across the 0-900ms window, asserting it never regresses to
`waitingForInput` while the celebration is in flight. 29/29 tests pass
(was 28), `npm run build` clean, `npm run lint` shows only the one
pre-existing, unrelated warning (`useGameSession.ts` missing `isStale` dep
on a different `useCallback` — present before this session, left alone).

No other issues found during the manual pass.

## Session update — 2026-07-10 16:40 — two bugs reported by the user, both fixed

User ran the dev server themselves and reported two issues:

**1. The 🌈 rainbow celebration covers the letter.** Root cause:
`.celebration-layer` is `position: fixed; inset: 0` with flex centering, so
the big (5–9rem) rainbow/dancing-animal/sticker icons rendered dead-center
of the viewport — exactly on top of the also-centered `letter-display` box.
Confirmed visually (screenshot showed the rainbow sitting directly over the
letter square) and fixed in
`src/components/CelebrationLayer/CelebrationLayer.css`: these three icons
are now `position: absolute; top: max(72px, 8%)` (anchored near the top of
the viewport, centered horizontally via `left/right/margin-inline: auto`
rather than `transform: translateX(-50%)`, since Framer Motion's own
scale/rotate animation overwrites the whole `transform` property and would
have clobbered a CSS-based translate-centering). Also shrank their max size
slightly (9rem → 6rem) for extra clearance. Re-verified with a Playwright
screenshot forcing the rainbow animation via a stubbed `Math.random` — it
now floats clearly above the letter box, no overlap.

**2. Letters are pronounced "Capital E" instead of just "E".** Verified
this is a real, deterministic quirk of macOS's `say` command, not a one-off:
`say "E"` and `say "Capital E"` produce byte-identical-duration audio output
(0.931429s, matched to 6 decimal places), while `say "e"` (lowercase) is
about half that (0.462857s) — i.e. `say` literally speaks "Capital E" when
given a bare isolated uppercase letter, but reads a bare lowercase letter as
just its name. This affected all 26 letters uniformly (also confirmed for
A) and was a bug in `scripts/generate-audio.sh`, which had been passing the
uppercase letter as the TTS input text for `letter-*.m4a`.

Fixed:
- `scripts/generate-audio.sh`: `letter-*.m4a` clips now synthesize the
  lowercase letter (`$lower`) instead of `$letter`, so they say "E" not
  "Capital E". Also simplified the `pair-*.m4a` phrase from
  `"$letter. Uppercase $letter. Lowercase $lower."` (which had the same
  bare-uppercase-letter problem in its first sentence, likely also saying
  "Capital E" redundantly before "Uppercase E...") to
  `"Uppercase $letter, lowercase $lower."`.
- `src/services/audioService.ts`: updated the `SpeechSynthesis` fallback
  text in `playLetterSound` (now lowercase) and `playPairSound` (dropped
  the same redundant leading bare-letter sentence) to match, in case the
  browser's live speech engine has a similar quirk.
- Regenerated all 214 audio files (26 letters × {letter, word, prompt,
  pair} × 2 accents + 2 test-sound clips) via `scripts/generate-audio.sh`
  on this machine. Spot-checked: `public/audio/us/letter-E.m4a` now
  measures 0.462857s — an exact match to the known-good lowercase-only
  duration, confirming the fix took effect. Same check passed for `letter-A.m4a`.

Note: I can't literally listen to the regenerated clips in this environment
(no audio playback available to me), so this fix is verified by the
`say`/`afconvert` duration match rather than by ear — worth a quick
listening spot-check on your end to confirm it sounds right, especially for
letters I didn't individually test (only E and A were duration-checked
directly; the rest went through the same code path so should behave
identically, but flagging in case any letter has an idiosyncrasy).

Verified after both fixes: `npx vitest run` 29/29 pass, `npm run build`
clean, `npm run lint` shows only the one pre-existing unrelated warning.
`dist/` is now stale relative to the regenerated `public/audio/` — rerun
`npm run build` before deploying if you were using `dist/` directly.
