import { THEME_MAP, THEMES } from "../../data/themes";
import type { GameMode, GameSettings } from "../../types/game";
import { ModeCard } from "../../components/ModeCard/ModeCard";
import "./WelcomePage.css";

interface WelcomePageProps {
  settings: GameSettings;
  onChangeSettings: (patch: Partial<GameSettings>) => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenParentSettings: () => void;
}

const MODES: Array<{ mode: GameMode; icon: string; title: string; description: string }> = [
  {
    mode: "free-play",
    icon: "🎹",
    title: "Free Play",
    description: "Press any letter and see what happens!",
  },
  {
    mode: "find-letter",
    icon: "🎯",
    title: "Find the Letter",
    description: "We say a letter — you find it on the keyboard.",
  },
  {
    mode: "listen-and-find",
    icon: "👂",
    title: "Listen and Find",
    description: "Listen carefully, then press the letter you heard.",
  },
  {
    mode: "case-match",
    icon: "🔤",
    title: "Case Match",
    description: "Match big letters (A) with little letters (a).",
  },
];

const BG_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function WelcomePage({ settings, onChangeSettings, onSelectMode, onOpenParentSettings }: WelcomePageProps) {
  const theme = THEME_MAP[settings.theme];

  return (
    <div className="welcome-page">
      <div className="welcome-page__bg-letters" aria-hidden="true">
        {BG_LETTERS.map((letter, i) => (
          <span key={letter} className={`welcome-page__bg-letter welcome-page__bg-letter--${i}`}>
            {letter}
          </span>
        ))}
      </div>

      <div className="welcome-page__top-bar">
        <button
          type="button"
          className="welcome-page__icon-btn"
          onClick={() => onChangeSettings({ soundEnabled: !settings.soundEnabled })}
          aria-label={settings.soundEnabled ? "Mute sound" : "Unmute sound"}
        >
          {settings.soundEnabled ? "🔊" : "🔇"}
        </button>
        <button type="button" className="welcome-page__icon-btn" onClick={onOpenParentSettings} aria-label="Settings">
          ⚙️
        </button>
      </div>

      <main className="welcome-page__main">
        <div className="welcome-page__header">
          <span className="welcome-page__mascot" aria-hidden="true">{theme.icon}</span>
          <h1 className="welcome-page__title">Letterlearn</h1>
        </div>

        <div className="welcome-page__grid">
          {MODES.map((item) => (
            <ModeCard
              key={item.mode}
              icon={item.icon}
              title={item.title}
              description={item.description}
              onSelect={() => onSelectMode(item.mode)}
            />
          ))}
        </div>

        <div className="welcome-page__themes" role="group" aria-label="Choose theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`welcome-page__theme-btn${settings.theme === t.id ? " welcome-page__theme-btn--active" : ""}`}
              onClick={() => onChangeSettings({ theme: t.id })}
              aria-label={t.name}
              aria-pressed={settings.theme === t.id}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
