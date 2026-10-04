import { useCallback, useEffect, useRef, useState } from "react";
import { getLearningData, getEnabledKeys, getItemContentType } from "../data/learningContent";
import { CELEBRATION_ANIMATIONS, ENCOURAGEMENTS, GENTLE_HINTS } from "../data/encouragements";
import type { CelebrationAnimationId } from "../data/encouragements";
import { createLetterPicker, pickIsUppercase } from "../utils/letterSelection";
import { pickRandom } from "../utils/random";
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
  mistakesThisQuestion: number;
  isSessionComplete: boolean;
  totalQuestions: number | "infinite";
  submitLetter: (letter: string) => void;
  replay: () => void;
  replayWord: () => void;
  skipToNext: () => void;
  restart: () => void;
}

function effectiveMode(settings: GameSettings): GameSettings["mode"] {
  return settings.contentType !== "letters" && settings.mode === "case-match" ? "find-letter" : settings.mode;
}

export function useGameSession(settings: GameSettings, progressApi: ProgressApi, paused = false): GameSessionApi {
  const speech = useSpeech(settings);
  const [phase, setPhase] = useState<QuestionPhase>("idle");
  const [currentLetter, setCurrentLetter] = useState("");
  const [displayUppercase, setDisplayUppercase] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [celebrationAnimation, setCelebrationAnimation] = useState<CelebrationAnimationId | null>(null);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [mistakesThisQuestion, setMistakesThisQuestion] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const lastLetterRef = useRef<string | null>(null);
  const lastIncorrectTimeRef = useRef(-Infinity);
  const answeredRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const pendingTimers = useRef(new Map<ReturnType<typeof setTimeout>, () => void>());
  const cycleIndexRef = useRef(0);
  const randomPickerRef = useRef(createLetterPicker());
  const hasScoredRef = useRef(false);
  const generationRef = useRef(0);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wasPausedRef = useRef(paused);
  if (paused) wasPausedRef.current = true;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const progressRef = useRef(progressApi);
  progressRef.current = progressApi;

  const isStale = useCallback((generation: number) => pausedRef.current || generation !== generationRef.current, []);

  // Resolve canceled waits too: their generation checks terminate the old flow.
  const delay = useCallback((ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      pendingTimers.current.delete(timer);
      resolve();
    }, ms);
    pendingTimers.current.set(timer, resolve);
  }), []);

  const cancelPending = useCallback(() => {
    generationRef.current += 1;
    clearTimeout(autoNextTimerRef.current);
    for (const [timer, resolve] of pendingTimers.current) {
      clearTimeout(timer);
      resolve();
    }
    pendingTimers.current.clear();
  }, []);

  const playWord = useCallback((letter: string) => {
    const current = settingsRef.current;
    if (getItemContentType(letter) === "numbers") return speech.playLetterSound(letter);
    const data = getLearningData(letter, current.contentType);
    return data ? speech.playWordSound(data.word, data.audioSlug) : Promise.resolve();
  }, [speech]);

  const announceTarget = useCallback((letter: string) => {
    const generation = generationRef.current;
    setPhase("presenting");
    const current = settingsRef.current;
    const announce = effectiveMode(current) === "find-letter"
      ? speech.playPromptSound(letter)
      : effectiveMode(current) === "listen-and-find" ? speech.playLetterSound(letter) : Promise.resolve();
    void announce.then(() => {
      if (isStale(generation)) return;
      setPhase((phase) => phase === "presenting" ? "waitingForInput" : phase);
    });
  }, [isStale, speech]);

  const presentQuestion = useCallback(() => {
    if (pausedRef.current) return;
    cancelPending();
    speech.stop();
    hasScoredRef.current = false;
    lastIncorrectTimeRef.current = -Infinity;
    setMistakesThisQuestion(0);
    setHint(null);
    setEncouragement(null);
    setCelebrationAnimation(null);

    const current = settingsRef.current;
    const enabledLetters = getEnabledKeys(current);
    const nextLetter = current.randomOrder
      ? randomPickerRef.current(enabledLetters, lastLetterRef.current)
      : enabledLetters[cycleIndexRef.current % enabledLetters.length];
    if (!current.randomOrder) {
      cycleIndexRef.current += 1;
    }
    lastLetterRef.current = nextLetter;
    const isUpper = pickIsUppercase(current.caseMode);
    setCurrentLetter(nextLetter);
    setDisplayUppercase(isUpper);
    announceTarget(nextLetter);
  }, [announceTarget, cancelPending, speech]);

  const finishRound = useCallback(() => {
    if (pausedRef.current) return;
    setPhase("nextQuestion");
    const current = settingsRef.current;
    if (current.questionCount !== "infinite" && answeredRef.current >= current.questionCount) {
      setIsSessionComplete(true);
    } else if (current.autoNext) {
      const generation = generationRef.current;
      autoNextTimerRef.current = setTimeout(() => {
        if (!isStale(generation)) presentQuestion();
      }, current.autoNextDelayMs);
    }
  }, [isStale, presentQuestion]);

  const runCelebration = useCallback(
    async (letter: string, countAnswer = true) => {
      const generation = generationRef.current;
      const current = settingsRef.current;
      if (countAnswer) {
        answeredRef.current += 1;
        setQuestionsAnswered(answeredRef.current);
        setStreak((previous) => previous + 1);
      }
      setPhase("correctFeedback");
      speech.playEffect("correct");

      if (effectiveMode(current) === "case-match") {
        await speech.playPairSound(letter);
      } else {
        await playWord(letter);
      }
      if (isStale(generation)) return;

      if (effectiveMode(current) !== "case-match" && (current.showWords || current.wordSpeechEnabled)) {
        setPhase("showingWord");
      }

      setPhase("celebration");
      setEncouragement(pickRandom(ENCOURAGEMENTS));
      setCelebrationAnimation(pickRandom(CELEBRATION_ANIMATIONS));

      await delay(CELEBRATION_DURATION_MS);
      if (isStale(generation)) return;
      finishRound();
    },
    [delay, finishRound, isStale, playWord, speech],
  );

  const handleIncorrect = useCallback(
    (letter: string) => {
      const now = Date.now();
      if (now - lastIncorrectTimeRef.current < INCORRECT_COOLDOWN_MS) return;
      lastIncorrectTimeRef.current = now;
      setMistakesThisQuestion((previous) => previous + 1);
      const generation = generationRef.current;
      speech.playEffect("incorrect");
      setPhase("incorrectFeedback");
      setHint(pickRandom(GENTLE_HINTS));
      progressRef.current.recordAttempt(letter, false);
      setStreak(0);

      void delay(INCORRECT_RESET_DELAY_MS).then(() => {
        // A correct answer may have already landed while this timer was
        // pending (e.g. a quick retry right after a miss) — don't clobber
        // its celebration back to a blank waiting state.
        if (isStale(generation) || hasScoredRef.current) return;
        setPhase("waitingForInput");
      });
    },
    [delay, isStale, speech],
  );

  const submitLetter = useCallback(
    (pressed: string) => {
      if (pausedRef.current) return;
      const current = settingsRef.current;
      if (!getLearningData(pressed, current.contentType)) return;

      if (current.mode === "free-play") {
        setMistakesThisQuestion(0);
        cancelPending();
        speech.stop();
        setCurrentLetter(pressed);
        setDisplayUppercase(pickIsUppercase(current.caseMode));
        setPhase("showingWord");
        speech.playEffect("click");
        const generation = generationRef.current;
        void speech.playLetterSound(pressed).then(async () => {
          if (isStale(generation)) return;
          if (getItemContentType(pressed) === "letters") {
            await delay(300);
            if (isStale(generation)) return;
            const wordData = getLearningData(pressed, current.contentType);
            if (wordData) await speech.playWordSound(wordData.word, wordData.audioSlug);
          }
          if (isStale(generation)) return;
          setPhase("celebration");
          setCelebrationAnimation(pickRandom(CELEBRATION_ANIMATIONS));
          await delay(CELEBRATION_DURATION_MS);
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
        setMistakesThisQuestion(0);
        progressRef.current.recordAttempt(currentLetter, true);
        void runCelebration(currentLetter);
      } else {
        handleIncorrect(currentLetter);
      }
    },
    [cancelPending, currentLetter, delay, handleIncorrect, isStale, phase, runCelebration, speech],
  );

  const interruptFreeSequence = useCallback(() => {
    if (settingsRef.current.mode === "free-play") {
      cancelPending();
      speech.stop();
      setPhase("waitingForInput");
      setCelebrationAnimation(null);
    }
  }, [cancelPending, speech]);

  const replay = useCallback(() => {
    if (pausedRef.current || !currentLetter) return;
    interruptFreeSequence();
    void speech.playLetterSound(currentLetter);
  }, [currentLetter, interruptFreeSequence, speech]);

  const replayWord = useCallback(() => {
    if (pausedRef.current || !currentLetter) return;
    interruptFreeSequence();
    void playWord(currentLetter);
  }, [currentLetter, interruptFreeSequence, playWord]);

  const skipToNext = useCallback(() => {
    if (pausedRef.current || phase !== "nextQuestion") return;
    clearTimeout(autoNextTimerRef.current);
    presentQuestion();
  }, [phase, presentQuestion]);

  const restart = useCallback(() => {
    cancelPending();
    speech.stop();
    answeredRef.current = 0;
    lastIncorrectTimeRef.current = -Infinity;
    lastLetterRef.current = null;
    cycleIndexRef.current = 0;
    randomPickerRef.current = createLetterPicker();
    hasScoredRef.current = false;
    setCurrentLetter("");
    setStreak(0);
    setQuestionsAnswered(0);
    setMistakesThisQuestion(0);
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
  }, [cancelPending, presentQuestion, speech]);

  useEffect(() => {
    if (!pausedRef.current) wasPausedRef.current = false;
    restart();
    return () => {
      cancelPending();
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode, settings.contentType]);

  useEffect(() => {
    if (paused) {
      cancelPending();
      speech.stop();
      return;
    }
    // Initial presentation is owned by restart. Only recover an interrupted flow.
    if (!wasPausedRef.current) return;
    wasPausedRef.current = false;
    setDisplayUppercase(pickIsUppercase(settingsRef.current.caseMode));
    if (isSessionComplete) return;
    if (settingsRef.current.mode === "free-play") {
      if (currentLetter && getLearningData(currentLetter, settingsRef.current.contentType)) {
        submitLetter(currentLetter);
      } else {
        setCurrentLetter("");
        setPhase("waitingForInput");
      }
    } else if (hasScoredRef.current) {
      if (phase === "nextQuestion") finishRound();
      else void runCelebration(currentLetter, false);
    } else if (!currentLetter || !getEnabledKeys(settingsRef.current).includes(currentLetter)) {
      presentQuestion();
    } else {
      setHint(null);
      announceTarget(currentLetter);
    }
    // Resume once per pause transition, using the latest render's settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return {
    phase,
    currentLetter,
    displayUppercase,
    hint,
    encouragement,
    celebrationAnimation,
    streak,
    questionsAnswered,
    mistakesThisQuestion,
    isSessionComplete,
    totalQuestions: settings.questionCount,
    submitLetter,
    replay,
    replayWord,
    skipToNext,
    restart,
  };
}
