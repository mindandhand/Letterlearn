import { useEffect, useRef, useState } from "react";
import { useSettings } from "./hooks/useSettings";
import { useProgress } from "./hooks/useProgress";
import { audioService } from "./services/audioService";
import type { GameMode, Page } from "./types/game";
import { WelcomePage } from "./pages/WelcomePage/WelcomePage";
import { ModeSelectPage } from "./pages/ModeSelectPage/ModeSelectPage";
import { GamePage } from "./pages/GamePage/GamePage";
import { ParentSettings } from "./components/ParentSettings/ParentSettings";
import { useSpeech } from "./hooks/useSpeech";

function App() {
  const [page, setPage] = useState<Page>("welcome");
  const [isWelcomeSettingsOpen, setWelcomeSettingsOpen] = useState(false);
  const { settings, updateSettings } = useSettings();
  const { progress, recordAttempt, resetProgress } = useProgress();
  const speech = useSpeech(settings);
  const hasUnlockedRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    function handleFirstInteraction(): void {
      if (hasUnlockedRef.current) return;
      hasUnlockedRef.current = true;
      audioService.unlockAudio();
      if (settings.musicEnabled && settings.soundEnabled) {
        audioService.startMusic();
      }
    }
    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasUnlockedRef.current) return;
    if (settings.musicEnabled && settings.soundEnabled) {
      audioService.startMusic();
    } else {
      audioService.stopMusic();
    }
  }, [settings.musicEnabled, settings.soundEnabled]);

  useEffect(() => {
    audioService.setVolume(settings.volume);
  }, [settings.volume]);

  function handleSelectMode(mode: GameMode): void {
    updateSettings({ mode });
    setPage("game");
  }

  function handleTestSound(): void {
    void speech.playTestSound();
  }

  return (
    <div className="app-shell">
      {page === "welcome" && (
        <WelcomePage
          settings={settings}
          onChangeSettings={updateSettings}
          onStart={() => setPage("mode-select")}
          onOpenParentSettings={() => setWelcomeSettingsOpen(true)}
        />
      )}

      {page === "mode-select" && (
        <ModeSelectPage onSelectMode={handleSelectMode} onBack={() => setPage("welcome")} />
      )}

      {page === "game" && (
        <GamePage
          settings={settings}
          onChangeSettings={updateSettings}
          progress={progress}
          recordAttempt={recordAttempt}
          resetProgress={resetProgress}
          onBack={() => setPage("mode-select")}
        />
      )}

      {page !== "game" && (
        <ParentSettings
          isOpen={isWelcomeSettingsOpen}
          settings={settings}
          progress={progress}
          onChange={updateSettings}
          onResetProgress={resetProgress}
          onClose={() => setWelcomeSettingsOpen(false)}
          onTestSound={handleTestSound}
        />
      )}
    </div>
  );
}

export default App;
