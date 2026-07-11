import type { GameSettings } from "../types/game";
import { FIRST_LETTER_KEYS } from "./letters";

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "free-play",
  caseMode: "mixed",
  enabledLetters: FIRST_LETTER_KEYS,
  soundEnabled: true,
  letterSpeechEnabled: true,
  wordSpeechEnabled: true,
  effectsEnabled: true,
  musicEnabled: false,
  volume: 0.8,
  accent: "us",
  theme: "rainbow",
  questionCount: 10,
  randomOrder: true,
  autoNext: true,
  autoNextDelayMs: 2200,
  reducedMotion: false,
  showWords: true,
  showEmoji: true,
};
