interface AnswerFeedbackProps {
  correct: boolean;
  retry: boolean;
}

/** A fixed-size, non-blocking place for feedback that needs no reading. */
export function AnswerFeedback({ correct, retry }: AnswerFeedbackProps) {
  return (
    <div className="game-page__answer-feedback">
      {correct && (
        <svg className="game-page__correct-icon" role="img" aria-label="Correct! Star earned" viewBox="0 0 160 88">
          <circle cx="45" cy="44" r="36" fill="#e0f5e9" />
          <path d="m24 44 14 15 28-31" fill="none" stroke="#198754" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="122" cy="44" r="29" fill="#fff3c4" />
          <path d="m122 19 7.5 15.2 16.8 2.4-12.2 11.9 2.9 16.8-15-7.9-15 7.9 2.9-16.8-12.2-11.9 16.8-2.4Z" fill="#f6be2b" stroke="#b77b12" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
      {!correct && retry && (
        <svg className="game-page__retry-icon" role="img" aria-label="Try again" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="#fff0dd" />
          <path d="M26 35a23 23 0 1 1-2 18M26 20v15h15" fill="none" stroke="#cc812d" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
