import type { GameSettings } from "../../types/game";
import "./SoundControls.css";

interface SoundControlsProps {
  settings: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  onTestSound: () => void;
}

export function SoundControls({ settings, onChange, onTestSound }: SoundControlsProps) {
  return (
    <div className="sound-controls">
      <label className="sound-controls__row sound-controls__row--main">
        <span>All sound</span>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(event) => onChange({ soundEnabled: event.target.checked })}
        />
      </label>

      <label className="sound-controls__row">
        <span>Letter names</span>
        <input
          type="checkbox"
          checked={settings.letterSpeechEnabled}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ letterSpeechEnabled: event.target.checked })}
        />
      </label>

      <label className="sound-controls__row">
        <span>Word names</span>
        <input
          type="checkbox"
          checked={settings.wordSpeechEnabled}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ wordSpeechEnabled: event.target.checked })}
        />
      </label>

      <label className="sound-controls__row">
        <span>Sound effects</span>
        <input
          type="checkbox"
          checked={settings.effectsEnabled}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ effectsEnabled: event.target.checked })}
        />
      </label>

      <label className="sound-controls__row">
        <span>Background music</span>
        <input
          type="checkbox"
          checked={settings.musicEnabled}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ musicEnabled: event.target.checked })}
        />
      </label>

      <label className="sound-controls__row sound-controls__row--volume">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.volume}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ volume: Number(event.target.value) })}
        />
      </label>

      <label className="sound-controls__row">
        <span>Accent</span>
        <select
          value={settings.accent}
          disabled={!settings.soundEnabled}
          onChange={(event) => onChange({ accent: event.target.value as GameSettings["accent"] })}
        >
          <option value="us">American English</option>
          <option value="gb">British English</option>
        </select>
      </label>

      <button type="button" className="sound-controls__test" onClick={onTestSound}>
        🔊 Test sound
      </button>
    </div>
  );
}
