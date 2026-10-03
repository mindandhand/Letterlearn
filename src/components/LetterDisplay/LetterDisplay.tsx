import type { LearningContentType, QuestionPhase } from "../../types/game";
import "./LetterDisplay.css";

interface LetterDisplayProps {
  letter: string;
  contentType?: LearningContentType;
  isUppercase: boolean;
  phase: QuestionPhase;
  reducedMotion: boolean;
  onReplay: () => void;
  disabled?: boolean;
}

function displayChar(letter: string, isUppercase: boolean): string {
  return isUppercase ? letter : letter.toLowerCase();
}

export function LetterDisplay({ letter, isUppercase, phase, reducedMotion, onReplay, disabled, contentType = "letters" }: LetterDisplayProps) {
  const isCorrect = ["correctFeedback", "showingWord", "celebration", "nextQuestion"].includes(phase);
  const statusClass = phase === "incorrectFeedback" ? "letter-display--incorrect" : isCorrect ? "letter-display--correct" : "";
  const className = `letter-display ${statusClass}${reducedMotion ? " letter-display--still" : ""}`;

  if (!letter) {
    return (
      <div className={`${className} letter-display--placeholder`}>
        <span aria-hidden="true">?</span>
        <span className="visually-hidden">Press any {contentType === "mixed" ? "letter or number" : contentType === "numbers" ? "number" : "letter"} key to begin</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={`Listen to ${contentType === "numbers" ? "number" : "letter"} ${displayChar(letter, isUppercase)}`}
      onClick={onReplay}
      disabled={disabled}
    >
      <span className="letter-display__char">{displayChar(letter, isUppercase)}</span>
    </button>
  );
}
