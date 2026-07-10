import type { LetterCaseMode, ProgressRecord } from "../types/game";

const MISTAKE_WEIGHT_BOOST = 3;
const STREAK_WEIGHT_PENALTY = 0.5;
const MIN_WEIGHT = 0.5;
const STREAK_THRESHOLD_FOR_PENALTY = 3;

function weightForLetter(letter: string, progress: ProgressRecord): number {
  const record = progress[letter];
  if (!record) {
    return 1;
  }
  let weight = 1;
  if (record.mistakes > 0 && record.currentStreak === 0) {
    weight += MISTAKE_WEIGHT_BOOST;
  }
  if (record.currentStreak >= STREAK_THRESHOLD_FOR_PENALTY) {
    weight = Math.max(MIN_WEIGHT, weight - STREAK_WEIGHT_PENALTY);
  }
  return weight;
}

/**
 * Weighted random letter selection. Avoids repeating the previous letter
 * when more than one letter is available, and favors letters the child
 * has recently gotten wrong.
 */
export function pickNextLetter(
  enabledLetters: string[],
  progress: ProgressRecord,
  lastLetter: string | null,
): string {
  if (enabledLetters.length === 0) {
    throw new Error("enabledLetters must not be empty");
  }
  if (enabledLetters.length === 1) {
    return enabledLetters[0];
  }

  const candidates = enabledLetters.filter((letter) => letter !== lastLetter);
  const pool = candidates.length > 0 ? candidates : enabledLetters;

  const weights = pool.map((letter) => weightForLetter(letter, progress));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return pool[i];
    }
  }
  return pool[pool.length - 1];
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
