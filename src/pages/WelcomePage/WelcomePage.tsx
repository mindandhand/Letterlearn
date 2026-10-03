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
  const isNumbers = settings.contentType === "numbers";
  const isMixed = settings.contentType === "mixed";
  const backgroundKeys = isNumbers ? Array.from({ length: 10 }, (_, i) => String(i)) : isMixed ? ["A", "1", "B", "2", "C", "3", "D", "4", "E", "5"] : BG_LETTERS;

  return (
    <div className="welcome-page">
      <div className="welcome-page__bg-letters" aria-hidden="true">
        {backgroundKeys.map((letter, i) => (
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

        <div className="welcome-page__choices" role="group" aria-label="Choose learning content">
          {(["letters", "numbers", "mixed"] as const).map((contentType) => (
            <button type="button" key={contentType} aria-pressed={settings.contentType === contentType}
              onClick={() => onChangeSettings({ contentType, ...(contentType !== "letters" && settings.mode === "case-match" ? { mode: "find-letter" as const } : {}) })}>
              {contentType === "letters" ? "Letters" : contentType === "numbers" ? "Numbers" : "Mixed"}
            </button>
          ))}
        </div>
        {!isNumbers && (
          <div className="welcome-page__choices" role="group" aria-label="Choose letter case">
            {([ ["uppercase", "Uppercase ABC"], ["lowercase", "Lowercase abc"], ["mixed", "Mixed Aa"] ] as const).map(([caseMode, label]) => (
              <button type="button" key={caseMode} aria-pressed={settings.caseMode === caseMode}
                onClick={() => onChangeSettings({ caseMode })}>{label}</button>
            ))}
          </div>
        )}

        <div className="welcome-page__grid">
          {MODES.filter((item) => settings.contentType === "letters" || item.mode !== "case-match").map((item) => (
            <ModeCard
              key={item.mode}
              icon={item.icon}
              title={isMixed ? item.title.replace("Letter", "Key") : isNumbers ? item.title.replace("Letter", "Number") : item.title}
              description={isMixed ? item.description.replaceAll("letter", "letter or number") : isNumbers ? item.description.replaceAll("letter", "number") : item.description}
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
