import { LETTERS } from "../../data/letters";
import { getMasteryLevel } from "../../services/progressService";
import type { ProgressRecord } from "../../types/game";
import "./ProgressStars.css";

interface ProgressHeaderProps {
  variant: "header";
  streak: number;
}

interface ProgressGridProps {
  variant: "grid";
  progress: ProgressRecord;
}

type ProgressStarsProps = ProgressHeaderProps | ProgressGridProps;

const HEADER_MAX_STARS = 5;

const MASTERY_LABEL: Record<"new" | "learning" | "familiar", string> = {
  new: "Needs practice",
  learning: "Improving",
  familiar: "Familiar!",
};

const MASTERY_ICON: Record<"new" | "learning" | "familiar", string> = {
  new: "☆",
  learning: "⭐",
  familiar: "🌟",
};

export function ProgressStars(props: ProgressStarsProps) {
  if (props.variant === "header") {
    const filled = Math.min(props.streak, HEADER_MAX_STARS);
    return (
      <div className="progress-stars-header" aria-label={`Current streak: ${props.streak}`}>
        {Array.from({ length: HEADER_MAX_STARS }, (_, i) => (
          <span key={i} aria-hidden="true">
            {i < filled ? "⭐" : "☆"}
          </span>
        ))}
        {props.streak > HEADER_MAX_STARS && <span className="progress-stars-header__count">×{props.streak}</span>}
      </div>
    );
  }

  return (
    <div className="progress-stars-grid">
      {LETTERS.map((letter) => {
        const mastery = getMasteryLevel(props.progress[letter.uppercase]);
        return (
          <div
            key={letter.uppercase}
            className={`progress-stars-grid__cell progress-stars-grid__cell--${mastery}`}
            title={MASTERY_LABEL[mastery]}
          >
            <span className="progress-stars-grid__letter">{letter.uppercase}</span>
            <span aria-hidden="true">{MASTERY_ICON[mastery]}</span>
          </div>
        );
      })}
    </div>
  );
}
