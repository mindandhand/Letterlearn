import { useEffect, useRef } from "react";

interface UseKeyboardInputOptions {
  /** When false, the listener is removed entirely (e.g. while a settings modal is open). */
  enabled: boolean;
  onLetterPress: (letter: string) => void;
}

const IGNORED_TARGET_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Listens for A-Z key presses on the window. Ignores held-key repeats,
 * modifier combinations, non-letter keys, and typing inside form fields.
 * Case is normalized via event.key.toLowerCase() so Caps Lock never affects
 * letter matching.
 */
export function useKeyboardInput({ enabled, onLetterPress }: UseKeyboardInputOptions): void {
  const callbackRef = useRef(onLetterPress);
  callbackRef.current = onLetterPress;

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
      if (key.length !== 1 || key < "a" || key > "z") {
        return;
      }

      callbackRef.current(key.toUpperCase());
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
