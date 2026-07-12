import { useCallback, useEffect, useRef, useState } from "react";
import { ALL_LETTER_KEYS, getLetterData } from "../data/letters";
import { CELEBRATION_ANIMATIONS, ENCOURAGEMENTS, GENTLE_HINTS } from "../data/encouragements";
import type { CelebrationAnimationId } from "../data/encouragements";
import { pickIsUppercase, pickNextLetter } from "../utils/letterSelection";
import { pickRandom } from "../utils/random";
import { wait } from "../utils/wait";
import type { GameSettings, ProgressRecord, QuestionPhase } from "../types/game";
import { useSpeech } from "./useSpeech";

const CELEBRATION_DURATION_MS = 1600;
const INCORRECT_RESET_DELAY_MS = 700;
const INCORRECT_COOLDOWN_MS = 800;

interface ProgressApi {
  progress: ProgressRecord;
  recordAttempt: (letter: string, correct: boolean) => void;
}

export interface GameSessionApi {
  phase: QuestionPhase;
  currentLetter: string;
  displayUppercase: boolean;
  hint: string | null;
  encouragement: string | null;
  celebrationAnimation: CelebrationAnimationId | null;
  streak: number;
  questionsAnswered: number;
  isSessionComplete: boolean;
  totalQuestions: number | "infinite";
  submitLetter: (letter: string) => void;
  replay: () => void;
  skipToNext: () => void;
  restart: () => void;
}

function resolveEnabledLetters(settings: GameSettings): string[] {
  return settings.enabledLetters.length > 0 ? settings.enabledLetters : ALL_LETTER_KEYS;
}

export function useGameSession(settings: GameSettings, progressApi: ProgressApi): GameSessionApi {
  const speech = useSpeech(settings);
  const [phase, setPhase] = useState<QuestionPhase>("idle");
  const [currentLetter, setCurrentLetter] = useState("");
  const [displayUppercase, setDisplayUppercase] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [celebrationAnimation, setCelebrationAnimation] = useState<CelebrationAnimationId | null>(null);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const lastLetterRef = useRef<string | null>(null);
  const lastIncorrectTimeRef = useRef(0);
  const cycleIndexRef = useRef(0);
  const hasScoredRef = useRef(false);
  const generationRef = useRef(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const progressRef = useRef(progressApi);
  progressRef.current = progressApi;

  const isStale = useCallback((generation: number) => generation !== generationRef.current, []);

  const presentQuestion = useCallback(() => {
    clearTimeout(autoNextTimerRef.current);
    const generation = generationRef.current;
    hasScoredRef.current = false;
    setHint(null);
    setEncouragement(null);
    setCelebrationAnimation(null);

    const current = settingsRef.current;
    const enabledLetters = resolveEnabledLetters(current);
    const nextLetter = current.randomOrder
      ? pickNextLetter(enabledLetters, progressRef.current.progress, lastLetterRef.current)
      : enabledLetters[cycleIndexRef.current % enabledLetters.length];
    if (!current.randomOrder) {
      cycleIndexRef.current += 1;
    }
    lastLetterRef.current = nextLetter;
    const isUpper = pickIsUppercase(current.caseMode);
    setCurrentLetter(nextLetter);
    setDisplayUppercase(isUpper);
    setPhase("presenting");

    const announce =
      current.mode === "find-letter"
        ? speech.playPromptSound(nextLetter)
        : current.mode === "listen-and-find"
          ? speech.playLetterSound(nextLetter)
          : Promise.resolve();

    void announce.then(() => {
      if (isStale(generation)) return;
      // Only advance the phase if the child hasn't already answered while the
      // prompt was still being announced (early/eager key presses are allowed).
      setPhase((current) => (current === "presenting" ? "waitingForInput" : current));
    });
  }, [isStale, speech]);

  const runCelebration = useCallback(
    async (letter: string) => {
      const generation = generationRef.current;
      const current = settingsRef.current;
      setPhase("correctFeedback");
      speech.playEffect("correct");

      if (current.mode === "case-match") {
        await speech.playPairSound(letter);
      } else {
        await speech.playCorrectSound(letter);
      }
      if (isStale(generation)) return;

      if (current.mode !== "case-match" && (current.showWords || current.wordSpeechEnabled)) {
        setPhase("showingWord");
      }

      setPhase("celebration");
      setEncouragement(pickRandom(ENCOURAGEMENTS));
      setCelebrationAnimation(pickRandom(CELEBRATION_ANIMATIONS));
      speech.playEffect("celebration");
      setStreak((previous) => previous + 1);
      setQuestionsAnswered((previous) => previous + 1);

      await wait(CELEBRATION_DURATION_MS);
      if (isStale(generation)) return;

      setPhase("nextQuestion");

      const questionCount = current.questionCount;
      const answeredNow = questionsAnswered + 1;
      const sessionDone = questionCount !== "infinite" && answeredNow >= questionCount;

      if (sessionDone) {
        setIsSessionComplete(true);
        return;
      }

      if (current.autoNext) {
        autoNextTimerRef.current = setTimeout(() => {
          if (!isStale(generation)) presentQuestion();
        }, current.autoNextDelayMs);
      }
    },
    [isStale, presentQuestion, questionsAnswered, speech],
  );

  const handleIncorrect = useCallback(
    (letter: string) => {
      const now = Date.now();
      if (now - lastIncorrectTimeRef.current < INCORRECT_COOLDOWN_MS) return;
      lastIncorrectTimeRef.current = now;
      const generation = generationRef.current;
      speech.playEffect("incorrect");
      setPhase("incorrectFeedback");
      setHint(pickRandom(GENTLE_HINTS));
      progressRef.current.recordAttempt(letter, false);
      setStreak(0);
      void speech.playHintSound(letter);

      setTimeout(() => {
        // A correct answer may have already landed while this timer was
        // pending (e.g. a quick retry right after a miss) — don't clobber
        // its celebration back to a blank waiting state.
        if (isStale(generation) || hasScoredRef.current) return;
        setPhase("waitingForInput");
      }, INCORRECT_RESET_DELAY_MS);
    },
    [isStale, speech],
  );

  const submitLetter = useCallback(
    (pressed: string) => {
      const current = settingsRef.current;

      if (current.mode === "free-play") {
        generationRef.current += 1;
        setCurrentLetter(pressed);
        setDisplayUppercase(pickIsUppercase(current.caseMode));
        setPhase("showingWord");
        speech.playEffect("click");
        const generation = generationRef.current;
        void speech.playLetterSound(pressed).then(async () => {
          if (isStale(generation)) return;
          await speech.playPhonicsSound(pressed);
          if (isStale(generation)) return;
          const wordData = getLetterData(pressed);
          if (wordData) {
            await speech.playWordSound(wordData.word, wordData.audioSlug);
          }
          if (isStale(generation)) return;
          setPhase("celebration");
          setCelebrationAnimation(pickRandom(CELEBRATION_ANIMATIONS));
          await wait(CELEBRATION_DURATION_MS);
          if (isStale(generation)) return;
          setPhase("waitingForInput");
        });
        return;
      }

      if (phase !== "waitingForInput" && phase !== "incorrectFeedback" && phase !== "presenting") {
        return;
      }
      if (hasScoredRef.current) {
        return;
      }

      const correct = pressed === currentLetter;
      if (correct) {
        hasScoredRef.current = true;
        progressRef.current.recordAttempt(currentLetter, true);
        void runCelebration(currentLetter);
      } else {
        handleIncorrect(currentLetter);
      }
    },
    [currentLetter, handleIncorrect, phase, runCelebration, speech],
  );

  const replay = useCallback(() => {
    const current = settingsRef.current;
    if (!currentLetter) return;
    if (current.mode === "find-letter") {
      void speech.playPromptSound(currentLetter);
    } else {
      void speech.playLetterSound(currentLetter);
    }
  }, [currentLetter, speech]);

  const skipToNext = useCallback(() => {
    if (phase !== "nextQuestion") return;
    clearTimeout(autoNextTimerRef.current);
    presentQuestion();
  }, [phase, presentQuestion]);

  const restart = useCallback(() => {
    generationRef.current += 1;
    clearTimeout(autoNextTimerRef.current);
    lastLetterRef.current = null;
    cycleIndexRef.current = 0;
    hasScoredRef.current = false;
    setStreak(0);
    setQuestionsAnswered(0);
    setIsSessionComplete(false);
    setHint(null);
    setEncouragement(null);
    setCelebrationAnimation(null);

    if (settingsRef.current.mode === "free-play") {
      setCurrentLetter("");
      setPhase("waitingForInput");
    } else {
      presentQuestion();
    }
  }, [presentQuestion]);

  useEffect(() => {
    restart();
    return () => {
      generationRef.current += 1;
      clearTimeout(autoNextTimerRef.current);
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode]);

  return {
    phase,
    currentLetter,
    displayUppercase,
    hint,
    encouragement,
    celebrationAnimation,
    streak,
    questionsAnswered,
    isSessionComplete,
    totalQuestions: settings.questionCount,
    submitLetter,
    replay,
    skipToNext,
    restart,
  };
}
