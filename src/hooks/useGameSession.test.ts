import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameSession } from "./useGameSession";
import { audioService } from "../services/audioService";
import type { GameSettings, ProgressRecord } from "../types/game";

vi.mock("../services/audioService", () => ({
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

const baseSettings: GameSettings = {
  mode: "find-letter",
  contentType: "letters",
  enabledNumbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
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
    expect(audioService.playCorrectSound).not.toHaveBeenCalled();
    expect(audioService.playWordSound).toHaveBeenCalled();
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
    expect(audioService.playHintSound).not.toHaveBeenCalled();

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

describe("simplified session and settings pause", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("separates free-play letter and word with a short gap and omits phonics", async () => {
    const { result } = renderHook(() => useGameSession({ ...baseSettings, mode: "free-play" }, makeProgressApi()));
    await act(async () => result.current.submitLetter("B"));
    expect(audioService.playLetterSound).toHaveBeenCalledWith("B", "us");
    expect(audioService.playWordSound).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
    expect(audioService.playPhonicsSound).not.toHaveBeenCalled();
  });

  it("pauses completed feedback and resumes without losing or double-counting the answer", async () => {
    const progress = makeProgressApi();
    const { result, rerender } = renderHook(({ paused }) => useGameSession({ ...baseSettings, questionCount: 5 }, progress, paused), { initialProps: { paused: false } });
    await act(async () => {});
    for (let i = 0; i < 4; i += 1) {
      await act(async () => result.current.submitLetter(result.current.currentLetter));
      await act(async () => vi.advanceTimersByTimeAsync(2000));
    }
    let finishWord!: () => void;
    vi.mocked(audioService.playWordSound).mockImplementationOnce(() => new Promise<void>((resolve) => { finishWord = resolve; }));
    const target = result.current.currentLetter;
    act(() => result.current.submitLetter(target));
    rerender({ paused: true });
    await act(async () => finishWord());
    await act(async () => vi.advanceTimersByTimeAsync(10000));
    expect(result.current.currentLetter).toBe(target);
    act(() => result.current.submitLetter(target));
    expect(progress.recordAttempt).toHaveBeenCalledTimes(5);
    rerender({ paused: false });
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.questionsAnswered).toBe(5);
    expect(result.current.isSessionComplete).toBe(true);
  });

  it("preserves a waiting target across pause and separately replays its word", async () => {
    const progress = makeProgressApi();
    const { result, rerender } = renderHook(({ paused }) => useGameSession(baseSettings, progress, paused), { initialProps: { paused: false } });
    await act(async () => {});
    const target = result.current.currentLetter;
    rerender({ paused: true });
    act(() => result.current.replay());
    expect(audioService.playLetterSound).not.toHaveBeenCalled();
    rerender({ paused: false });
    await act(async () => {});
    expect(result.current.currentLetter).toBe(target);
    act(() => result.current.replayWord());
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
  });
});

it("letter replay cancels the pending free-play word sequence", async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  try {
    const { result } = renderHook(() => useGameSession({ ...baseSettings, mode: "free-play" }, makeProgressApi()));
    await act(async () => result.current.submitLetter("B"));
    await act(async () => result.current.replay());
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(audioService.playLetterSound).toHaveBeenCalledTimes(2);
    expect(audioService.playWordSound).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});

it("preserves a free-play letter outside the practice range while settings are open", async () => {
  const progress = makeProgressApi();
  const { result, rerender } = renderHook(({ paused }) => useGameSession({ ...baseSettings, mode: "free-play" }, progress, paused), { initialProps: { paused: false } });
  await act(async () => result.current.submitLetter("F"));
  rerender({ paused: true });
  rerender({ paused: false });
  await act(async () => {});
  expect(result.current.currentLetter).toBe("F");
});

it("honors disabled word speech on correct answers without substituting a longer clip", async () => {
  vi.clearAllMocks();
  const { result } = renderHook(() => useGameSession({ ...baseSettings, wordSpeechEnabled: false }, makeProgressApi()));
  await act(async () => {});
  await act(async () => result.current.submitLetter(result.current.currentLetter));
  expect(audioService.playWordSound).not.toHaveBeenCalled();
  expect(audioService.playCorrectSound).not.toHaveBeenCalled();
  expect(result.current.phase).toBe("celebration");
});

it("keeps case-match pair speech", async () => {
  vi.clearAllMocks();
  const { result } = renderHook(() => useGameSession({ ...baseSettings, mode: "case-match" }, makeProgressApi()));
  await act(async () => {});
  const target = result.current.currentLetter;
  await act(async () => result.current.submitLetter(target));
  expect(audioService.playPairSound).toHaveBeenCalledWith(target, "us");
  expect(audioService.playWordSound).not.toHaveBeenCalled();
});

it("replaces a removed waiting target when the practice range changes during settings", async () => {
  const progress = makeProgressApi();
  const initial = { paused: false, settings: { ...baseSettings, enabledLetters: ["A"] } };
  const { result, rerender } = renderHook(({ paused, settings }) => useGameSession(settings, progress, paused), { initialProps: initial });
  await act(async () => {});
  expect(result.current.currentLetter).toBe("A");
  rerender({ paused: true, settings: initial.settings });
  rerender({ paused: false, settings: { ...initial.settings, enabledLetters: ["B"] } });
  await act(async () => {});
  expect(result.current.currentLetter).toBe("B");
  expect(progress.recordAttempt).not.toHaveBeenCalled();
});


describe("number learning sessions", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const numbers: GameSettings = { ...baseSettings, contentType: "numbers", enabledNumbers: ["0", "2"], randomOrder: false };

  it("starts at zero, ignores letters and symbols, and scores a wrong digit against the target", async () => {
    const progress = makeProgressApi();
    const { result } = renderHook(() => useGameSession(numbers, progress));
    await act(async () => {});
    expect(result.current.currentLetter).toBe("0");
    act(() => { result.current.submitLetter("A"); result.current.submitLetter("!"); });
    expect(progress.recordAttempt).not.toHaveBeenCalled();
    act(() => result.current.submitLetter("2"));
    expect(progress.recordAttempt).toHaveBeenCalledWith("0", false);
    await act(async () => result.current.submitLetter("0"));
    expect(audioService.playLetterSound).toHaveBeenCalledWith("0", "us");
    expect(audioService.playWordSound).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.currentLetter).toBe("2");
  });

  it("reads a free-play digit exactly once without word or pair audio", async () => {
    const { result } = renderHook(() => useGameSession({ ...numbers, mode: "free-play" }, makeProgressApi()));
    await act(async () => result.current.submitLetter("0"));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.currentLetter).toBe("0");
    expect(audioService.playLetterSound).toHaveBeenCalledTimes(1);
    expect(audioService.playWordSound).not.toHaveBeenCalled();
    expect(audioService.playPairSound).not.toHaveBeenCalled();
    await act(async () => result.current.replayWord());
    expect(audioService.playLetterSound).toHaveBeenCalledTimes(2);
  });

  it("restarts selected content while paused and ignores an old pending letter announcement", async () => {
    let finishLetter!: () => void;
    vi.mocked(audioService.playPromptSound).mockImplementationOnce(() => new Promise<void>((resolve) => { finishLetter = resolve; }));
    const progress = makeProgressApi();
    const { result, rerender } = renderHook(({ settings, paused }) => useGameSession(settings, progress, paused), { initialProps: { settings: baseSettings, paused: false } });
    rerender({ settings: numbers, paused: true });
    await act(async () => finishLetter());
    rerender({ settings: numbers, paused: false });
    await act(async () => {});
    expect(result.current.currentLetter).toBe("0");
    expect(result.current.phase).toBe("waitingForInput");
    expect(result.current.questionsAnswered).toBe(0);
  });

  it("falls back to find mode for numbers with an invalid case-match setting", async () => {
    const { result } = renderHook(() => useGameSession({ ...numbers, mode: "case-match" }, makeProgressApi()));
    await act(async () => {});
    expect(audioService.playPromptSound).toHaveBeenCalledWith("0", "us");
    await act(async () => result.current.submitLetter("0"));
    expect(audioService.playPairSound).not.toHaveBeenCalled();
    expect(audioService.playLetterSound).toHaveBeenCalledTimes(1);
  });

  it("abandons a pending correct word when content changes and starts a fresh number session", async () => {
    let finishWord!: () => void;
    vi.mocked(audioService.playWordSound).mockImplementationOnce(() => new Promise<void>((resolve) => { finishWord = resolve; }));
    const progress = makeProgressApi();
    const { result, rerender } = renderHook(({ settings, paused }) => useGameSession(settings, progress, paused), { initialProps: { settings: baseSettings, paused: false } });
    await act(async () => {});
    act(() => result.current.submitLetter(result.current.currentLetter));
    expect(result.current.questionsAnswered).toBe(1);
    rerender({ settings: baseSettings, paused: true });
    rerender({ settings: numbers, paused: false });
    await act(async () => finishWord());
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.currentLetter).toBe("0");
    expect(result.current.questionsAnswered).toBe(0);
    expect(result.current.phase).toBe("waitingForInput");
  });

  it("ignores digits in letter sessions", async () => {
    const { result } = renderHook(() => useGameSession({ ...baseSettings, mode: "free-play" }, makeProgressApi()));
    act(() => result.current.submitLetter("0"));
    expect(result.current.currentLetter).toBe("");
    expect(audioService.playLetterSound).not.toHaveBeenCalled();
  });
});


it.each([false, true])("applies updated case when resuming while preserving target and score (answered=%s)", async (answered) => {
  const progress = makeProgressApi();
  const initial: GameSettings = { ...baseSettings, caseMode: "uppercase" };
  const { result, rerender } = renderHook(({ settings, paused }) => useGameSession(settings, progress, paused), { initialProps: { settings: initial, paused: false } });
  await act(async () => {});
  const target = result.current.currentLetter;
  if (answered) await act(async () => result.current.submitLetter(target));
  expect(result.current.displayUppercase).toBe(true);
  rerender({ settings: initial, paused: true });
  rerender({ settings: { ...initial, caseMode: "lowercase" }, paused: false });
  await act(async () => {});
  expect(result.current.displayUppercase).toBe(false);
  expect(result.current.currentLetter).toBe(target);
  expect(result.current.questionsAnswered).toBe(answered ? 1 : 0);
  expect(progress.recordAttempt).toHaveBeenCalledTimes(answered ? 1 : 0);
});


describe("per-question mistake hints", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("counts accepted mistakes at the hint threshold and preserves cooldown and count across pause", async () => {
    const progress = makeProgressApi();
    const settings = { ...baseSettings, enabledLetters: ["A"] };
    const { result, rerender } = renderHook(({ paused }) => useGameSession(settings, progress, paused), { initialProps: { paused: false } });
    await act(async () => {});
    expect(result.current.mistakesThisQuestion).toBe(0);
    act(() => result.current.submitLetter("B"));
    expect(result.current.mistakesThisQuestion).toBe(1);
    rerender({ paused: true });
    act(() => result.current.submitLetter("B"));
    await act(async () => vi.advanceTimersByTimeAsync(799));
    rerender({ paused: false });
    await act(async () => {});
    act(() => result.current.submitLetter("B"));
    expect(result.current.mistakesThisQuestion).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    act(() => result.current.submitLetter("B"));
    expect(result.current.mistakesThisQuestion).toBe(2);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(2);
    expect(audioService.playHintSound).not.toHaveBeenCalled();
  });

  it("clears the hint immediately on a correct retry and keeps scoring once into the next question", async () => {
    const progress = makeProgressApi();
    const { result } = renderHook(() => useGameSession({ ...baseSettings, enabledLetters: ["A", "B"], randomOrder: false }, progress));
    await act(async () => {});
    act(() => result.current.submitLetter("B"));
    await act(async () => vi.advanceTimersByTimeAsync(800));
    act(() => result.current.submitLetter("B"));
    expect(result.current.mistakesThisQuestion).toBe(2);
    act(() => { result.current.submitLetter("A"); result.current.submitLetter("A"); });
    expect(result.current.mistakesThisQuestion).toBe(0);
    expect(result.current.questionsAnswered).toBe(1);
    expect(progress.recordAttempt).toHaveBeenCalledTimes(3);
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.currentLetter).toBe("B");
    expect(result.current.mistakesThisQuestion).toBe(0);
  });

  it("resets mistakes for a replacement range, restart, content switch and free play", async () => {
    const progress = makeProgressApi();
    const initial: GameSettings = { ...baseSettings, enabledLetters: ["A"] };
    const { result, rerender } = renderHook(({ settings, paused }) => useGameSession(settings, progress, paused), { initialProps: { settings: initial, paused: false } });
    await act(async () => {});
    act(() => result.current.submitLetter("B"));
    rerender({ settings: initial, paused: true });
    const replacement = { ...initial, enabledLetters: ["B"] };
    rerender({ settings: replacement, paused: false });
    await act(async () => {});
    expect(result.current.currentLetter).toBe("B");
    expect(result.current.mistakesThisQuestion).toBe(0);
    act(() => result.current.submitLetter("A"));
    expect(result.current.mistakesThisQuestion).toBe(1);
    await act(async () => result.current.restart());
    expect(result.current.mistakesThisQuestion).toBe(0);
    act(() => result.current.submitLetter("A"));
    rerender({ settings: { ...replacement, contentType: "numbers", enabledNumbers: ["0"] }, paused: false });
    await act(async () => {});
    expect(result.current.mistakesThisQuestion).toBe(0);
    act(() => result.current.submitLetter("1"));
    expect(result.current.mistakesThisQuestion).toBe(1);
    rerender({ settings: { ...replacement, contentType: "numbers", mode: "free-play" }, paused: false });
    await act(async () => result.current.submitLetter("0"));
    expect(result.current.mistakesThisQuestion).toBe(0);
  });
});


describe("mixed learning sessions", () => {
  const mixed: GameSettings = { ...baseSettings, contentType: "mixed", enabledLetters: ["B", "D"], enabledNumbers: ["0", "2"], randomOrder: false };
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("reads letters with words and literal zero once in the same free-play session", async () => {
    const { result } = renderHook(() => useGameSession({ ...mixed, mode: "free-play" }, makeProgressApi()));
    await act(async () => result.current.submitLetter("B"));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(audioService.playWordSound).toHaveBeenCalledWith("Ball", "ball", "us");
    await act(async () => result.current.submitLetter("0"));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.currentLetter).toBe("0");
    expect(vi.mocked(audioService.playLetterSound).mock.calls.map(([key]) => key)).toEqual(["B", "0"]);
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
    await act(async () => result.current.replayWord());
    expect(audioService.playLetterSound).toHaveBeenLastCalledWith("0", "us");
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
  });

  it("records cross-category mistakes and follows the configured interleaved range", async () => {
    const progress = makeProgressApi();
    const { result } = renderHook(() => useGameSession(mixed, progress));
    await act(async () => {});
    expect(result.current.currentLetter).toBe("B");
    act(() => result.current.submitLetter("0"));
    expect(progress.recordAttempt).toHaveBeenLastCalledWith("B", false);
    await act(async () => result.current.submitLetter("B"));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.currentLetter).toBe("0");
    act(() => result.current.submitLetter("D"));
    expect(progress.recordAttempt).toHaveBeenLastCalledWith("0", false);
    await act(async () => result.current.submitLetter("0"));
    expect(audioService.playLetterSound).toHaveBeenLastCalledWith("0", "us");
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(result.current.currentLetter).toBe("D");
  });

  it("alternates random categories while weighting mistakes within each configured category", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6).mockReturnValueOnce(0.4);
    const progress = makeProgressApi();
    progress.progress.B = { attempts: 1, mistakes: 1, correct: 0, currentStreak: 0, bestStreak: 0 };
    progress.progress["0"] = { attempts: 1, mistakes: 1, correct: 0, currentStreak: 0, bestStreak: 0 };
    const { result } = renderHook(() => useGameSession({ ...mixed, randomOrder: true, caseMode: "uppercase" }, progress));
    await act(async () => {});
    const targets: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      targets.push(result.current.currentLetter);
      await act(async () => result.current.submitLetter(result.current.currentLetter));
      await act(async () => vi.advanceTimersByTimeAsync(2000));
    }
    expect(targets).toEqual(["B", "0", "B", "0"]);
    expect(progress.recordAttempt.mock.calls).toEqual([["B", true], ["0", true], ["B", true], ["0", true]]);
  });

  it("can start the random mix with a number", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    const { result } = renderHook(() => useGameSession({ ...mixed, randomOrder: true, enabledNumbers: ["0"], caseMode: "uppercase" }, makeProgressApi()));
    await act(async () => {});
    expect(result.current.currentLetter).toBe("0");
  });

  it("discards pending old free-play speech on switch to mixed and defends invalid case match", async () => {
    let finishLetter!: () => void;
    vi.mocked(audioService.playLetterSound).mockImplementationOnce(() => new Promise<void>((resolve) => { finishLetter = resolve; }));
    const progress = makeProgressApi();
    const initial: GameSettings = { ...baseSettings, mode: "free-play" };
    const { result, rerender } = renderHook(({ settings, paused }) => useGameSession(settings, progress, paused), { initialProps: { settings: initial, paused: false } });
    act(() => result.current.submitLetter("A"));
    rerender({ settings: initial, paused: true });
    rerender({ settings: { ...mixed, mode: "case-match" }, paused: false });
    await act(async () => finishLetter());
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.currentLetter).toBe("B");
    expect(audioService.playPromptSound).toHaveBeenLastCalledWith("B", "us");
    expect(audioService.playWordSound).not.toHaveBeenCalled();
    await act(async () => result.current.submitLetter("B"));
    expect(audioService.playPairSound).not.toHaveBeenCalled();
    expect(result.current.questionsAnswered).toBe(1);
  });
});
