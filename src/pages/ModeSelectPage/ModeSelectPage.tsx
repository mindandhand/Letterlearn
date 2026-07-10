import type { GameMode } from "../../types/game";
import { ModeCard } from "../../components/ModeCard/ModeCard";
import "./ModeSelectPage.css";

interface ModeSelectPageProps {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
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

export function ModeSelectPage({ onSelectMode, onBack }: ModeSelectPageProps) {
  return (
    <div className="mode-select-page">
      <header className="mode-select-page__header">
        <button type="button" className="mode-select-page__back" onClick={onBack}>
          ← Back
        </button>
        <h1 className="mode-select-page__title">Choose a Game</h1>
      </header>

      <div className="mode-select-page__grid">
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
    </div>
  );
}
