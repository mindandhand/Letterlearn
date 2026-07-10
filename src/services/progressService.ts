import type { LetterProgress, ProgressRecord } from "../types/game";

const STORAGE_KEY = "letter-learn:progress";

function createEmptyProgress(): LetterProgress {
  return {
    attempts: 0,
    correct: 0,
    mistakes: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function loadProgress(): ProgressRecord {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as ProgressRecord;
  } catch {
    return {};
  }
}

export function saveProgress(record: ProgressRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — progress just won't persist.
  }
}

export function recordAttempt(
  record: ProgressRecord,
  letter: string,
  correct: boolean,
): ProgressRecord {
  const previous = record[letter] ?? createEmptyProgress();
  const updated: LetterProgress = {
    attempts: previous.attempts + 1,
    correct: previous.correct + (correct ? 1 : 0),
    mistakes: previous.mistakes + (correct ? 0 : 1),
    currentStreak: correct ? previous.currentStreak + 1 : 0,
    bestStreak: correct ? Math.max(previous.bestStreak, previous.currentStreak + 1) : previous.bestStreak,
    lastPracticedAt: new Date().toISOString(),
  };
  return { ...record, [letter]: updated };
}

export function clearProgress(): ProgressRecord {
  saveProgress({});
  return {};
}

export function getMasteryLevel(progress: LetterProgress | undefined): "new" | "learning" | "familiar" {
  if (!progress || progress.attempts === 0) {
    return "new";
  }
  const accuracy = progress.correct / progress.attempts;
  if (progress.bestStreak >= 5 && accuracy >= 0.8) {
    return "familiar";
  }
  return "learning";
}

export function getMostMissedLetters(record: ProgressRecord, limit = 3): string[] {
  return Object.entries(record)
    .filter(([, progress]) => progress.mistakes > 0)
    .sort((a, b) => b[1].mistakes - a[1].mistakes)
    .slice(0, limit)
    .map(([letter]) => letter);
}
