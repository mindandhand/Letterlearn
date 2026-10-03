import { ALL_LETTER_KEYS } from "../../data/letters";
import { getMasteryLevel } from "../../services/progressService";
import { ALL_NUMBER_KEYS } from "../../data/numbers";
import type { LearningContentType, ProgressRecord } from "../../types/game";
import "./ProgressStars.css";

interface ProgressHeaderProps {
  variant: "header";
  earnedStars: number;
}

interface ProgressGridProps {
  variant: "grid";
  progress: ProgressRecord;
  contentType?: LearningContentType;
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
    const filled = Math.min(props.earnedStars, HEADER_MAX_STARS);
    return (
      <div className="progress-stars-header" aria-label={`Stars earned: ${props.earnedStars}`}>
        {Array.from({ length: HEADER_MAX_STARS }, (_, i) => (
          <span key={i} aria-hidden="true">
            {i < filled ? "⭐" : "☆"}
          </span>
        ))}
        {props.earnedStars > HEADER_MAX_STARS && <span className="progress-stars-header__count">×{props.earnedStars}</span>}
      </div>
    );
  }

  return (
    <div className="progress-stars-grid">
      {(props.contentType === "mixed" ? [...ALL_LETTER_KEYS, ...ALL_NUMBER_KEYS] : props.contentType === "numbers" ? ALL_NUMBER_KEYS : ALL_LETTER_KEYS).map((letter) => {
        const mastery = getMasteryLevel(props.progress[letter]);
        return (
          <div
            key={letter}
            className={`progress-stars-grid__cell progress-stars-grid__cell--${mastery}`}
            title={MASTERY_LABEL[mastery]}
          >
            <span className="progress-stars-grid__letter">{letter}</span>
            <span aria-hidden="true">{MASTERY_ICON[mastery]}</span>
          </div>
        );
      })}
    </div>
  );
}
