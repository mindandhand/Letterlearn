import { THEME_MAP } from "../../data/themes";
import type { GameSettings } from "../../types/game";
import { ThemeSelector } from "../../components/ThemeSelector/ThemeSelector";
import "./WelcomePage.css";

interface WelcomePageProps {
  settings: GameSettings;
  onChangeSettings: (patch: Partial<GameSettings>) => void;
  onStart: () => void;
  onOpenParentSettings: () => void;
}

export function WelcomePage({ settings, onChangeSettings, onStart, onOpenParentSettings }: WelcomePageProps) {
  const theme = THEME_MAP[settings.theme];

  return (
    <div className="welcome-page">
      <div className="welcome-page__decorations" aria-hidden="true">
        {theme.decorations.map((deco, i) => (
          <span key={i} className={`welcome-page__deco welcome-page__deco--${i}`}>
            {deco}
          </span>
        ))}
      </div>

      <button type="button" className="welcome-page__parent-link" onClick={onOpenParentSettings}>
        ⚙️ Parents
      </button>

      <main className="welcome-page__content">
        <h1 className="welcome-page__title">ABC Keyboard Adventure</h1>
        <p className="welcome-page__subtitle">Press, listen, and learn!</p>

        <button type="button" className="welcome-page__start" onClick={onStart}>
          ▶ Start Game
        </button>

        <label className="welcome-page__sound-toggle">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(event) => onChangeSettings({ soundEnabled: event.target.checked })}
          />
          <span>{settings.soundEnabled ? "🔊 Sound on" : "🔇 Sound off"}</span>
        </label>

        <div className="welcome-page__theme-preview">
          <p className="welcome-page__theme-label">Choose a look</p>
          <ThemeSelector currentTheme={settings.theme} onSelect={(nextTheme) => onChangeSettings({ theme: nextTheme })} />
        </div>
      </main>
    </div>
  );
}
