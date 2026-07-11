import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GamePage } from "./GamePage";
import type { GameSettings } from "../../types/game";

vi.mock("../../services/audioService", () => ({
  audioService: {
    playLetterSound: vi.fn().mockResolvedValue(undefined),
    playPhonicsSound: vi.fn().mockResolvedValue(undefined),
    playCorrectSound: vi.fn().mockResolvedValue(undefined),
    playHintSound: vi.fn().mockResolvedValue(undefined),
    playWordSound: vi.fn().mockResolvedValue(undefined),
    playPromptSound: vi.fn().mockResolvedValue(undefined),
    playPairSound: vi.fn().mockResolvedValue(undefined),
    playTestSound: vi.fn().mockResolvedValue(undefined),
    playEffect: vi.fn(),
    cancelSpeech: vi.fn(),
    unlockAudio: vi.fn(),
    isSpeechSupported: vi.fn().mockReturnValue(true),
  },
}));

const settings: GameSettings = {
  mode: "free-play",
  caseMode: "mixed",
  enabledLetters: ["A", "B", "C"],
  soundEnabled: true,
  letterSpeechEnabled: true,
  wordSpeechEnabled: true,
  effectsEnabled: true,
  musicEnabled: false,
  volume: 0.8,
  accent: "us",
  theme: "rainbow",
  questionCount: "infinite",
  randomOrder: true,
  autoNext: true,
  autoNextDelayMs: 50,
  reducedMotion: true,
  showWords: true,
  showEmoji: true,
};

function renderGamePage() {
  return render(
    <GamePage
      settings={settings}
      onChangeSettings={vi.fn()}
      progress={{}}
      recordAttempt={vi.fn()}
      resetProgress={vi.fn()}
      onBack={vi.fn()}
    />,
  );
}

describe("GamePage keyboard gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores keypresses while the parent settings panel is open, and resumes once it is closed", async () => {
    renderGamePage();

    expect(screen.getByText("Press any letter!")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(screen.getByRole("dialog", { name: "Parent settings" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByText("Press any letter!")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close settings"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Parent settings" })).not.toBeInTheDocument(),
    );

    fireEvent.keyDown(window, { key: "c" });
    await waitFor(() => expect(screen.queryByText("Press any letter!")).not.toBeInTheDocument());
  });
});
