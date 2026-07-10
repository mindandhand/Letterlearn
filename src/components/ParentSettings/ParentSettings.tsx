import { useEffect, useRef, useState } from "react";
import { ALL_LETTER_KEYS } from "../../data/letters";
import type { GameMode, GameSettings, LetterCaseMode, ProgressRecord, QuestionCount } from "../../types/game";
import { getMostMissedLetters } from "../../services/progressService";
import { SoundControls } from "../SoundControls/SoundControls";
import { ThemeSelector } from "../ThemeSelector/ThemeSelector";
import { ProgressStars } from "../ProgressStars/ProgressStars";
import { ParentGate } from "./ParentGate";
import "./ParentSettings.css";

interface ParentSettingsProps {
  isOpen: boolean;
  settings: GameSettings;
  progress: ProgressRecord;
  onChange: (patch: Partial<GameSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
  onTestSound: () => void;
}

const LETTER_RANGES: Array<{ label: string; letters: string[] }> = [
  { label: "A-Z (all)", letters: ALL_LETTER_KEYS },
  { label: "A-F", letters: ALL_LETTER_KEYS.slice(0, 6) },
  { label: "G-L", letters: ALL_LETTER_KEYS.slice(6, 12) },
  { label: "M-R", letters: ALL_LETTER_KEYS.slice(12, 18) },
  { label: "S-Z", letters: ALL_LETTER_KEYS.slice(18, 26) },
];

const MODE_LABELS: Record<GameMode, string> = {
  "find-letter": "Find the Letter",
  "free-play": "Free Play",
  "listen-and-find": "Listen and Find",
  "case-match": "Case Match",
};

const CASE_LABELS: Record<LetterCaseMode, string> = {
  uppercase: "Uppercase only",
  lowercase: "Lowercase only",
  mixed: "Mixed",
};

export function ParentSettings({
  isOpen,
  settings,
  progress,
  onChange,
  onResetProgress,
  onClose,
  onTestSound,
}: ParentSettingsProps) {
  const [unlocked, setUnlocked] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setUnlocked(false);
    } else {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function toggleLetter(letter: string): void {
    const isEnabled = settings.enabledLetters.includes(letter);
    if (isEnabled) {
      if (settings.enabledLetters.length <= 1) {
        return;
      }
      onChange({ enabledLetters: settings.enabledLetters.filter((item) => item !== letter) });
    } else {
      onChange({ enabledLetters: [...settings.enabledLetters, letter] });
    }
  }

  function handleResetProgress(): void {
    const confirmed = window.confirm("Clear all learning progress? This cannot be undone.");
    if (confirmed) {
      onResetProgress();
    }
  }

  const mostMissed = getMostMissedLetters(progress);

  return (
    <div className="parent-settings-overlay">
      <div className="parent-settings" role="dialog" aria-modal="true" aria-label="Parent settings">
        <button
          type="button"
          ref={closeButtonRef}
          className="parent-settings__close"
          onClick={onClose}
          aria-label="Close settings"
        >
          ✕
        </button>

        {!unlocked ? (
          <ParentGate onUnlock={() => setUnlocked(true)} onCancel={onClose} />
        ) : (
          <div className="parent-settings__body">
            <h2 className="parent-settings__title">Parent Settings</h2>

            <section className="parent-settings__section">
              <h3>Practice mode</h3>
              <div className="parent-settings__pills">
                {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`parent-settings__pill ${settings.mode === mode ? "parent-settings__pill--active" : ""}`}
                    onClick={() => onChange({ mode })}
                  >
                    {MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </section>

            <section className="parent-settings__section">
              <h3>Letter case</h3>
              <div className="parent-settings__pills">
                {(Object.keys(CASE_LABELS) as LetterCaseMode[]).map((caseMode) => (
                  <button
                    key={caseMode}
                    type="button"
                    className={`parent-settings__pill ${settings.caseMode === caseMode ? "parent-settings__pill--active" : ""}`}
                    onClick={() => onChange({ caseMode })}
                  >
                    {CASE_LABELS[caseMode]}
                  </button>
                ))}
              </div>
            </section>

            <section className="parent-settings__section">
              <h3>Letter range</h3>
              <div className="parent-settings__pills">
                {LETTER_RANGES.map((range) => (
                  <button
                    key={range.label}
                    type="button"
                    className="parent-settings__pill"
                    onClick={() => onChange({ enabledLetters: range.letters })}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="parent-settings__letter-grid">
                {ALL_LETTER_KEYS.map((letter) => (
                  <label key={letter} className="parent-settings__letter-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.enabledLetters.includes(letter)}
                      onChange={() => toggleLetter(letter)}
                    />
                    {letter}
                  </label>
                ))}
              </div>
            </section>

            <section className="parent-settings__section">
              <h3>Questions per round</h3>
              <div className="parent-settings__pills">
                {([5, 10, 15, "infinite"] as QuestionCount[]).map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`parent-settings__pill ${settings.questionCount === count ? "parent-settings__pill--active" : ""}`}
                    onClick={() => onChange({ questionCount: count })}
                  >
                    {count === "infinite" ? "No limit" : count}
                  </button>
                ))}
              </div>
            </section>

            <section className="parent-settings__section">
              <h3>Game flow</h3>
              <label className="parent-settings__toggle-row">
                <span>Random order</span>
                <input
                  type="checkbox"
                  checked={settings.randomOrder}
                  onChange={(event) => onChange({ randomOrder: event.target.checked })}
                />
              </label>
              <label className="parent-settings__toggle-row">
                <span>Auto-advance to next letter</span>
                <input
                  type="checkbox"
                  checked={settings.autoNext}
                  onChange={(event) => onChange({ autoNext: event.target.checked })}
                />
              </label>
              <label className="parent-settings__toggle-row">
                <span>Auto-advance delay ({(settings.autoNextDelayMs / 1000).toFixed(1)}s)</span>
                <input
                  type="range"
                  min={1000}
                  max={5000}
                  step={200}
                  value={settings.autoNextDelayMs}
                  onChange={(event) => onChange({ autoNextDelayMs: Number(event.target.value) })}
                />
              </label>
              <label className="parent-settings__toggle-row">
                <span>Show words</span>
                <input
                  type="checkbox"
                  checked={settings.showWords}
                  onChange={(event) => onChange({ showWords: event.target.checked })}
                />
              </label>
              <label className="parent-settings__toggle-row">
                <span>Show pictures</span>
                <input
                  type="checkbox"
                  checked={settings.showEmoji}
                  onChange={(event) => onChange({ showEmoji: event.target.checked })}
                />
              </label>
              <label className="parent-settings__toggle-row">
                <span>Reduce motion</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(event) => onChange({ reducedMotion: event.target.checked })}
                />
              </label>
            </section>

            <section className="parent-settings__section">
              <h3>Sound</h3>
              <SoundControls settings={settings} onChange={onChange} onTestSound={onTestSound} />
            </section>

            <section className="parent-settings__section">
              <h3>Theme</h3>
              <ThemeSelector currentTheme={settings.theme} onSelect={(theme) => onChange({ theme })} />
            </section>

            <section className="parent-settings__section">
              <h3>Learning record</h3>
              {mostMissed.length > 0 && (
                <p className="parent-settings__missed">Most practiced: {mostMissed.join(", ")}</p>
              )}
              <ProgressStars variant="grid" progress={progress} />
              <button type="button" className="parent-settings__reset" onClick={handleResetProgress}>
                Clear learning record
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
