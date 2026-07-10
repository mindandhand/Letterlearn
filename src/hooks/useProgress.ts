import { useCallback, useState } from "react";
import {
  clearProgress,
  loadProgress,
  recordAttempt as recordAttemptInStore,
  saveProgress,
} from "../services/progressService";
import type { ProgressRecord } from "../types/game";

export function useProgress() {
  const [progress, setProgress] = useState<ProgressRecord>(() => loadProgress());

  const recordAttempt = useCallback((letter: string, correct: boolean) => {
    setProgress((previous) => {
      const next = recordAttemptInStore(previous, letter, correct);
      saveProgress(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(clearProgress());
  }, []);

  return { progress, recordAttempt, resetProgress };
}
