import type { LearningContentType } from "../../types/game";
import "./KeyboardHint.css";

interface KeyboardHintProps {
  target: string;
  contentType: LearningContentType;
  reducedMotion?: boolean;
}

const LETTER_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const NUMBER_ROWS = ["1234567890"];

/** A location guide for the physical keyboard, not a second input method. */
export function KeyboardHint({ target, contentType, reducedMotion = false }: KeyboardHintProps) {
  const rows = contentType === "numbers" ? NUMBER_ROWS : LETTER_ROWS;
  return (
    <div
      className={`keyboard-hint${reducedMotion ? " keyboard-hint--still" : ""}`}
      role="img"
      aria-label="Keyboard hint"
      aria-description={`Find ${target.toUpperCase()} on the keyboard`}
    >
      <span className="keyboard-hint__symbol" aria-hidden="true">⌨</span>
      <div className="keyboard-hint__keys" aria-hidden="true">
        {rows.map((row, rowIndex) => (
          <div className={`keyboard-hint__row keyboard-hint__row--${rowIndex}`} key={row}>
            {[...row].map((key) => (
              <span className="keyboard-hint__key" data-highlighted={key === target.toUpperCase()} key={key}>
                {key}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
