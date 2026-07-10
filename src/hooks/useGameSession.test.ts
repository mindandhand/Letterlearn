import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSession } from "./useGameSession";
import type { GameSettings, ProgressRecord } from "../types/game";

vi.mock("../services/audioService", () => ({
  audioService: {
    playLetterSound: vi.fn().mockResolvedValue(undefined),
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

const baseSettings: GameSettings = {
  mode: "find-letter",
  caseMode: "mixed",
  enabledLetters: ["A", "B"],
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
  reducedMotion: false,
  showWords: true,
  showEmoji: true,
};

function makeProgressApi() {
  const progress: ProgressRecord = {};
  const recordAttempt = vi.fn();
  return { progress, recordAttempt };
}

describe("useGameSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the answer correct and records progress when the matching letter is pressed", async () => {
    const progressApi = makeProgressApi();
    const { result } = renderHook(() => useGameSession(baseSettings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    const target = result.current.currentLetter;

    act(() => {
      result.current.submitLetter(target);
    });

    expect(result.current.phase).toBe("correctFeedback");
    expect(progressApi.recordAttempt).toHaveBeenCalledWith(target, true);

    await waitFor(() => expect(result.current.phase).toBe("celebration"));
  });

  it("does not advance to a new letter when the wrong key is pressed, and keeps the question available", async () => {
    const progressApi = makeProgressApi();
    const { result } = renderHook(() => useGameSession(baseSettings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    const target = result.current.currentLetter;
    const wrongLetter = target === "A" ? "B" : "A";

    act(() => {
      result.current.submitLetter(wrongLetter);
    });

    expect(result.current.phase).toBe("incorrectFeedback");
    expect(progressApi.recordAttempt).toHaveBeenCalledWith(target, false);
    expect(result.current.currentLetter).toBe(target);

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    expect(result.current.currentLetter).toBe(target);
  }, 10000);

  it("shows the pressed letter immediately in free-play mode", async () => {
    const progressApi = makeProgressApi();
    const settings: GameSettings = { ...baseSettings, mode: "free-play" };
    const { result } = renderHook(() => useGameSession(settings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));

    act(() => {
      result.current.submitLetter("C");
    });

    expect(result.current.currentLetter).toBe("C");
  });

  it("automatically advances to a new question after the celebration and auto-next delay", async () => {
    const progressApi = makeProgressApi();
    const { result } = renderHook(() => useGameSession(baseSettings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    const target = result.current.currentLetter;

    act(() => {
      result.current.submitLetter(target);
    });

    await waitFor(() => expect(result.current.questionsAnswered).toBe(1), { timeout: 4000 });
    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"), { timeout: 4000 });
  }, 10000);

  it("does not let a late incorrect-answer reset timer erase a correct answer submitted shortly after", async () => {
    // Regression test: pressing the right key within the ~700ms "gentle
    // retry" window after a miss used to have its celebration wiped back to
    // waitingForInput by the earlier wrong-answer's delayed reset timer.
    const progressApi = makeProgressApi();
    const { result } = renderHook(() => useGameSession(baseSettings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    const target = result.current.currentLetter;
    const wrongLetter = target === "A" ? "B" : "A";

    act(() => {
      result.current.submitLetter(wrongLetter);
    });
    expect(result.current.phase).toBe("incorrectFeedback");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    act(() => {
      result.current.submitLetter(target);
    });
    expect(result.current.phase).toBe("correctFeedback");

    // Poll across the window where the stale incorrect-reset timer used to
    // fire (~700ms after the original miss) and assert the phase never
    // regresses to waitingForInput while the celebration is in flight.
    for (let waited = 0; waited < 900; waited += 100) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(result.current.phase).not.toBe("waitingForInput");
    }
  }, 10000);

  it("works without hanging when only a single letter is enabled in the practice range", async () => {
    const progressApi = makeProgressApi();
    const settings: GameSettings = { ...baseSettings, enabledLetters: ["A"] };
    const { result } = renderHook(() => useGameSession(settings, progressApi));

    await waitFor(() => expect(result.current.phase).toBe("waitingForInput"));
    expect(result.current.currentLetter).toBe("A");
  });
});
