import { useMemo, useState } from "react";
import { getItemContentType, getLearningData } from "../../data/learningContent";
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
import { AnswerFeedback } from "../../components/AnswerFeedback/AnswerFeedback";
import { KeyboardHint } from "../../components/KeyboardHint/KeyboardHint";
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
  const session = useGameSession(settings, { progress, recordAttempt }, isSettingsOpen);

  useKeyboardInput({
    contentType: settings.contentType,
    enabled: !isSettingsOpen && !session.isSessionComplete,
    onLetterPress: session.submitLetter,
  });

  const theme = THEME_MAP[settings.theme];
  const wordData = getLearningData(session.currentLetter, settings.contentType);
  const isNumbers = settings.contentType === "numbers";
  const isMixed = settings.contentType === "mixed";
  const targetContentType = getItemContentType(session.currentLetter);
  const itemName = isMixed ? "key" : isNumbers ? "number" : "letter";
  const isCaseMatch = settings.mode === "case-match" && settings.contentType === "letters";
  const modeLabel = settings.mode === "find-letter" || (settings.mode === "case-match" && !isCaseMatch)
    ? isMixed ? "Find the Key" : isNumbers ? "Find the Number" : "Find the Letter"
    : MODE_LABELS[settings.mode];
  const isListenMode = settings.mode === "listen-and-find";
  const isAnswerPhase = ANSWER_PHASES.has(session.phase);
  const isGuidedMode = settings.mode !== "free-play";
  const canHearLetter = settings.soundEnabled && settings.letterSpeechEnabled && settings.volume > 0;
  const letterToShow = isListenMode && !isAnswerPhase && canHearLetter ? "" : session.currentLetter;

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
          <p>You practiced {session.questionsAnswered} {isMixed ? "keys" : isNumbers ? "numbers" : "letters"}.</p>
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
        <span className="game-page__mode-label">{modeLabel}</span>
        <ProgressStars variant="header" earnedStars={session.questionsAnswered} />
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

      <main className={`game-page__main${isGuidedMode ? " game-page__main--guided" : ""}`}>
        {settings.mode === "free-play" && !session.currentLetter && (
          <p className="game-page__prompt">Press any {isMixed ? "letter or number" : itemName}!</p>
        )}
        {isListenMode && !isAnswerPhase && (
          <p className="game-page__prompt">
            {canHearLetter ? `Listen, then press the ${itemName}` : `Sound is off. Look at the ${itemName} and press its key.`}
          </p>
        )}

        <LetterDisplay
          letter={letterToShow}
          contentType={letterToShow ? targetContentType : settings.contentType}
          isUppercase={session.displayUppercase}
          phase={session.phase}
          reducedMotion={settings.reducedMotion}
          onReplay={session.replay}
          disabled={isSettingsOpen}
        />

        {isGuidedMode && <AnswerFeedback correct={isAnswerPhase} retry={session.phase === "incorrectFeedback"} />}

        {isGuidedMode && session.mistakesThisQuestion >= 2 && !isAnswerPhase && !isSettingsOpen && (
          <KeyboardHint target={session.currentLetter} contentType={targetContentType} reducedMotion={settings.reducedMotion} />
        )}

        {isCaseMatch && isAnswerPhase && session.currentLetter && (
          <div className="game-page__case-pair" aria-hidden="true">
            <span>{session.currentLetter}</span>
            <span>{session.currentLetter.toLowerCase()}</span>
          </div>
        )}

        {isListenMode && (
          <button type="button" className="game-page__replay" onClick={session.replay} disabled={isSettingsOpen}>
            🔊 Listen again
          </button>
        )}

        {!isGuidedMode && session.phase === "celebration" && session.encouragement && (
          <p className="game-page__encouragement">{session.encouragement}</p>
        )}

        {!isCaseMatch && (
          <WordCard
            word={wordData?.word}
            quantity={targetContentType === "numbers" && session.currentLetter ? Number(session.currentLetter) : undefined}
            emoji={wordData?.emoji}
            visible={isAnswerPhase || (settings.mode === "free-play" && Boolean(session.currentLetter))}
            showWord={settings.showWords}
            showEmoji={settings.showEmoji}
            reducedMotion={settings.reducedMotion}
            onReplay={session.replayWord}
            disabled={isSettingsOpen}
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

      {!isGuidedMode && <CelebrationLayer
        animation={session.celebrationAnimation}
        themeCelebrationIcon={theme.celebrationIcon}
        streak={session.streak}
        reducedMotion={settings.reducedMotion}
      />}

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
