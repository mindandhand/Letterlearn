export type GameMode = "find-letter" | "free-play" | "listen-and-find" | "case-match";

export type LearningContentType = "letters" | "numbers" | "mixed";

export type LetterCaseMode = "uppercase" | "lowercase" | "mixed";

export type ThemeId = "rainbow" | "space" | "forest" | "ocean";

export type AccentId = "us" | "gb";

export type QuestionCount = 5 | 10 | 15 | "infinite";

export interface GameSettings {
  contentType: LearningContentType;
  mode: GameMode;
  caseMode: LetterCaseMode;
  enabledLetters: string[];
  enabledNumbers: string[];
  soundEnabled: boolean;
  letterSpeechEnabled: boolean;
  wordSpeechEnabled: boolean;
  effectsEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  accent: AccentId;
  theme: ThemeId;
  questionCount: QuestionCount;
  randomOrder: boolean;
  autoNext: boolean;
  autoNextDelayMs: number;
  reducedMotion: boolean;
  showWords: boolean;
  showEmoji: boolean;
}

export interface LetterProgress {
  attempts: number;
  correct: number;
  mistakes: number;
  currentStreak: number;
  bestStreak: number;
  lastPracticedAt?: string;
}

export type ProgressRecord = Record<string, LetterProgress>;

export type QuestionPhase =
  | "idle"
  | "presenting"
  | "waitingForInput"
  | "correctFeedback"
  | "incorrectFeedback"
  | "showingWord"
  | "celebration"
  | "nextQuestion";

export interface CaseMatchQuestion {
  targetLetter: string;
  isUppercase: boolean;
}

export type Page = "welcome" | "game";
