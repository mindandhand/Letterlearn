import type { LetterCaseMode } from "../types/game";

/** Draw without replacement; each session owns its own shuffled cycle. */
export function createLetterPicker(): (enabledLetters: string[], lastLetter: string | null) => string {
  let range = "";
  let remaining: string[] = [];

  return (enabledLetters, lastLetter) => {
    const keys = [...new Set(enabledLetters)];
    if (keys.length === 0) throw new Error("enabledLetters must not be empty");
    const nextRange = JSON.stringify(keys.slice().sort());
    if (range !== nextRange || remaining.length === 0) {
      range = nextRange;
      remaining = [...keys];
    }
    // Also avoid adjacent repeats across cycles (unless only one key exists).
    const candidates = remaining.filter((key) => key !== lastLetter);
    const pool = candidates.length ? candidates : remaining;
    const next = pool[Math.floor(Math.random() * pool.length)];
    remaining.splice(remaining.indexOf(next), 1);
    return next;
  };
}

export function pickIsUppercase(caseMode: LetterCaseMode): boolean {
  if (caseMode === "uppercase") {
    return true;
  }
  if (caseMode === "lowercase") {
    return false;
  }
  return Math.random() < 0.5;
}
