import { useMemo, useState } from "react";
import { randomInt, shuffle } from "../../utils/random";
import "./ParentSettings.css";

interface ParentGateProps {
  onUnlock: () => void;
  onCancel: () => void;
}

function generateQuestion(): { question: string; answer: number } {
  const a = randomInt(3, 9);
  const b = randomInt(2, 9);
  return { question: `${a} × ${b}`, answer: a * b };
}

export function ParentGate({ onUnlock, onCancel }: ParentGateProps) {
  const [attempt, setAttempt] = useState(0);
  const { question, answer, options } = useMemo(() => {
    const generated = generateQuestion();
    const distractors = new Set<number>([generated.answer]);
    while (distractors.size < 3) {
      distractors.add(Math.max(1, generated.answer + randomInt(-6, 6)));
    }
    return { ...generated, options: shuffle(Array.from(distractors)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <div className="parent-gate" role="dialog" aria-modal="true" aria-label="Parent verification">
      <p className="parent-gate__title">Parents only</p>
      <p className="parent-gate__question">What is {question}?</p>
      <div className="parent-gate__options">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="parent-gate__option"
            onClick={() => (option === answer ? onUnlock() : setAttempt((n) => n + 1))}
          >
            {option}
          </button>
        ))}
      </div>
      <button type="button" className="parent-gate__cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
