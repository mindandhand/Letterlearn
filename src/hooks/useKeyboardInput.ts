import { useEffect, useRef } from "react";
import type { LearningContentType } from "../types/game";

const COOLDOWN_MS = 50;

interface UseKeyboardInputOptions {
  /** When false, the listener is removed entirely (e.g. while a settings modal is open). */
  enabled: boolean;
  contentType?: LearningContentType;
  onLetterPress: (letter: string) => void;
}

const IGNORED_TARGET_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Listens for A-Z or 0-9 key presses according to the selected content. Ignores held-key repeats,
 * modifier combinations, unrelated keys, and typing inside form fields.
 * Case is normalized via event.key.toLowerCase() so Caps Lock never affects
 * letter matching.
 */
export function useKeyboardInput({ enabled, contentType = "letters", onLetterPress }: UseKeyboardInputOptions): void {
  const callbackRef = useRef(onLetterPress);
  callbackRef.current = onLetterPress;
  const lastPressTimeRef = useRef(-Infinity);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.repeat) {
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && IGNORED_TARGET_TAGS.has(target.tagName)) {
        return;
      }

      const key = event.key.toLowerCase();
      const validKey = contentType === "mixed" ? /^[a-z0-9]$/.test(key)
        : contentType === "numbers" ? /^[0-9]$/.test(key) : /^[a-z]$/.test(key);
      if (!validKey) {
        return;
      }

      const now = Date.now();
      if (now - lastPressTimeRef.current < COOLDOWN_MS) return;
      lastPressTimeRef.current = now;
      callbackRef.current(key.toUpperCase());
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, contentType]);
}
