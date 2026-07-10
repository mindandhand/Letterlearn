import { motion } from "framer-motion";
import type { QuestionPhase } from "../../types/game";
import "./LetterDisplay.css";

interface LetterDisplayProps {
  letter: string;
  isUppercase: boolean;
  phase: QuestionPhase;
  reducedMotion: boolean;
}

function displayChar(letter: string, isUppercase: boolean): string {
  return isUppercase ? letter : letter.toLowerCase();
}

export function LetterDisplay({ letter, isUppercase, phase, reducedMotion }: LetterDisplayProps) {
  if (!letter) {
    return (
      <div className="letter-display letter-display--placeholder">
        <span aria-hidden="true">?</span>
        <span className="visually-hidden">Press any letter key to begin</span>
      </div>
    );
  }

  const statusClass =
    phase === "incorrectFeedback"
      ? "letter-display--incorrect"
      : phase === "correctFeedback" || phase === "celebration" || phase === "showingWord"
        ? "letter-display--correct"
        : "";

  const animation = reducedMotion
    ? {}
    : phase === "incorrectFeedback"
      ? { x: [0, -12, 12, -8, 8, 0] }
      : phase === "correctFeedback"
        ? { scale: [1, 1.25, 1.05, 1.1] }
        : { scale: 1 };

  return (
    <motion.div
      className={`letter-display ${statusClass}`}
      animate={animation}
      transition={{ duration: reducedMotion ? 0.01 : 0.5, ease: "easeOut" }}
      role="img"
      aria-label={`Letter ${displayChar(letter, isUppercase)}`}
    >
      <span className="letter-display__char">{displayChar(letter, isUppercase)}</span>
    </motion.div>
  );
}
