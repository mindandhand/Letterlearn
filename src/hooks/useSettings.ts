import { useCallback } from "react";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import { ALL_LETTER_KEYS } from "../data/letters";
import { ALL_NUMBER_KEYS } from "../data/numbers";
import type { GameSettings } from "../types/game";
import { useLocalStorage } from "./useLocalStorage";

const SETTINGS_KEY = "letter-learn:settings";

function normalizeSettings(saved: Partial<GameSettings> | null): GameSettings {
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  const validRange = (range: unknown, allowed: string[], fallback: string[]) => {
    const valid = Array.isArray(range)
      ? [...new Set(range.filter((key): key is string => typeof key === "string" && allowed.includes(key)))]
      : [];
    return valid.length ? valid : fallback;
  };
  merged.contentType = merged.contentType === "numbers" || merged.contentType === "mixed" ? merged.contentType : "letters";
  merged.caseMode = ["uppercase", "lowercase", "mixed"].includes(merged.caseMode)
    ? merged.caseMode : DEFAULT_SETTINGS.caseMode;
  merged.enabledLetters = validRange(merged.enabledLetters, ALL_LETTER_KEYS, DEFAULT_SETTINGS.enabledLetters);
  merged.enabledNumbers = validRange(merged.enabledNumbers, ALL_NUMBER_KEYS, DEFAULT_SETTINGS.enabledNumbers);
  if (merged.contentType !== "letters" && merged.mode === "case-match") merged.mode = "find-letter";
  return merged;
}

export function useSettings() {
  const [savedSettings, setSettings] = useLocalStorage<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const settings = normalizeSettings(savedSettings);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      setSettings((previous) => normalizeSettings({ ...normalizeSettings(previous), ...patch }));
    },
    [setSettings],
  );

  return { settings, updateSettings };
}
