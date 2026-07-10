import { useCallback } from "react";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import type { GameSettings } from "../types/game";
import { useLocalStorage } from "./useLocalStorage";

const SETTINGS_KEY = "letter-learn:settings";

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      setSettings((previous) => ({ ...previous, ...patch }));
    },
    [setSettings],
  );

  return { settings, updateSettings };
}
