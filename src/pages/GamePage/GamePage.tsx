import { useMemo, useState } from "react";
import { getLetterData } from "../../data/letters";
import { THEME_MAP } from "../../data/themes";
import { useGameSession } from "../../hooks/useGameSession";
import { useKeyboardInput } from "../../hooks/useKeyboardInput";
import { useSpeech } from "../../hooks/useSpeech";
import type { GameMode, GameSettings, ProgressRecord } from "../../types/game";
import { LetterDisplay } from "../../components/LetterDisplay/LetterDisplay";
import { WordCard } from "../../components/WordCard/WordCard";
import { CelebrationLayer } from "../../components/CelebrationLayer/CelebrationLayer";
import { ProgressStars } from "../../components/ProgressStars/ProgressStars";
import { ParentSettings } from "../../components/ParentSettings/ParentSettings";
import "./GamePage.css";

interface GamePageProps {
  settings: GameSettings;
  onChangeSettings: (patch: Partial<GameSettings>) => void;
  progress: ProgressRecord;
  recordAttempt: (letter: string, correct: boolean) => void;
  resetProgress: () => void;
  onBack: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  "find-letter": "Find the Letter",
  "free-play": "Free Play",
  "listen-and-find": "Listen and Find",
  "case-match": "Case Match",
};

const ANSWER_PHASES = new Set(["correctFeedback", "showingWord", "celebration", "nextQuestion"]);

export function GamePage({ settings, onChangeSettings, progress, recordAttempt, resetProgress, onBack }: GamePageProps) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const speech = useSpeech(settings);
  const session = useGameSession(settings, { progress, recordAttempt });

  useKeyboardInput({
    enabled: !isSettingsOpen && !session.isSessionComplete,
    onLetterPress: session.submitLetter,
  });

  const theme = THEME_MAP[settings.theme];
  const wordData = getLetterData(session.currentLetter);
  const isListenMode = settings.mode === "listen-and-find";
  const isAnswerPhase = ANSWER_PHASES.has(session.phase);
  const letterToShow = isListenMode && !isAnswerPhase ? "" : session.currentLetter;

  const ariaMessage = useMemo(() => {
    if (session.phase === "correctFeedback") return "Correct!";
    if (session.phase === "incorrectFeedback") return session.hint ?? "Try again";
    if (session.phase === "celebration") return session.encouragement ?? "";
    return "";
  }, [session.phase, session.hint, session.encouragement]);

  function handleTestSound(): void {
    void speech.playTestSound();
  }

  if (session.isSessionComplete) {
    return (
      <div className="game-page game-page--complete">
        <div className="game-page__complete-card">
          <h2>🎉 Great practice!</h2>
          <p>You practiced {session.questionsAnswered} letters.</p>
          <div className="game-page__complete-actions">
            <button type="button" onClick={session.restart}>
              Play again
            </button>
            <button type="button" onClick={onBack}>
              Back to menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <header className="game-page__header">
        <button type="button" className="game-page__icon-button" onClick={onBack} aria-label="Back to modes">
          ←
        </button>
        <span className="game-page__mode-label">{MODE_LABELS[settings.mode]}</span>
        <ProgressStars variant="header" streak={session.streak} />
        <button
          type="button"
          className="game-page__icon-button"
          aria-label={settings.soundEnabled ? "Mute sound" : "Unmute sound"}
          onClick={() => onChangeSettings({ soundEnabled: !settings.soundEnabled })}
        >
          {settings.soundEnabled ? "🔊" : "🔇"}
        </button>
        <button
          type="button"
          className="game-page__icon-button"
          aria-label="Open settings"
          onClick={() => setSettingsOpen(true)}
        >
          ⚙️
        </button>
      </header>

      <main className="game-page__main">
        {settings.mode === "free-play" && !session.currentLetter && (
          <p className="game-page__prompt">Press any letter!</p>
        )}
        {isListenMode && !isAnswerPhase && <p className="game-page__prompt">Listen, then press the letter</p>}

        <LetterDisplay
          letter={letterToShow}
          isUppercase={session.displayUppercase}
          phase={session.phase}
          reducedMotion={settings.reducedMotion}
        />

        {settings.mode === "case-match" && isAnswerPhase && session.currentLetter && (
          <div className="game-page__case-pair" aria-hidden="true">
            <span>{session.currentLetter}</span>
            <span>{session.currentLetter.toLowerCase()}</span>
          </div>
        )}

        {isListenMode && (
          <button type="button" className="game-page__replay" onClick={session.replay}>
            🔊 Listen again
          </button>
        )}

        {session.phase === "celebration" && session.encouragement && (
          <p className="game-page__encouragement">{session.encouragement}</p>
        )}

        {session.hint && session.phase === "incorrectFeedback" && (
          <p className="game-page__hint">{session.hint}</p>
        )}

        {settings.mode !== "case-match" && (
          <WordCard
            word={wordData?.word}
            emoji={wordData?.emoji}
            visible={isAnswerPhase}
            showWord={settings.showWords}
            showEmoji={settings.showEmoji}
            reducedMotion={settings.reducedMotion}
          />
        )}

        {session.phase === "nextQuestion" && (
          <button type="button" className="game-page__next" onClick={session.skipToNext}>
            Next ▶
          </button>
        )}

        <div className="visually-hidden" aria-live="polite">
          {ariaMessage}
        </div>
      </main>

      <CelebrationLayer
        animation={session.celebrationAnimation}
        themeCelebrationIcon={theme.celebrationIcon}
        streak={session.streak}
        reducedMotion={settings.reducedMotion}
      />

      <ParentSettings
        isOpen={isSettingsOpen}
        settings={settings}
        progress={progress}
        onChange={onChangeSettings}
        onResetProgress={resetProgress}
        onClose={() => setSettingsOpen(false)}
        onTestSound={handleTestSound}
      />
    </div>
  );
}
