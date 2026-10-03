import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamePage } from "./GamePage";
import type { GameSettings } from "../../types/game";
import { audioService } from "../../services/audioService";

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
  contentType: "letters",
  enabledNumbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
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

function renderGamePage(patch: Partial<GameSettings> = {}) {
  return render(
    <GamePage
      settings={{ ...settings, ...patch }}
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

describe("guided visual answer feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("shows a correct check immediately with sound off, without a visible praise paragraph", async () => {
    const { container } = renderGamePage({ mode: "find-letter", enabledLetters: ["A"], soundEnabled: false, autoNext: false });
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByRole("img", { name: "Correct! Star earned" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    expect(screen.getByRole("img", { name: "Correct! Star earned" })).toBeVisible();
    expect(container.querySelector(".game-page__encouragement")).toBeNull();
    expect(container.querySelector(".celebration-layer")).toBeNull();
    expect(screen.getByLabelText("Stars earned: 1")).toBeInTheDocument();
  });

  it("offers an orange retry cue and a keyboard hint after two misses, then clears it after success", async () => {
    const { container } = renderGamePage({ mode: "find-letter", enabledLetters: ["A"], soundEnabled: false, autoNext: false });
    fireEvent.keyDown(window, { key: "b" });
    expect(screen.getByRole("img", { name: "Try again" })).toBeVisible();
    expect(container.querySelector(".game-page__hint")).toBeNull();
    expect(screen.queryByLabelText("Keyboard hint")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(850); });
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByLabelText("Keyboard hint")).toBeVisible();
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(screen.queryByLabelText("Keyboard hint")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close settings"));
    expect(screen.getByLabelText("Keyboard hint")).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(60); });
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.queryByLabelText("Keyboard hint")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Correct! Star earned" })).toBeVisible();
  });

  it("keeps earned stars when the next answer is wrong", async () => {
    renderGamePage({ mode: "find-letter", enabledLetters: ["A", "B"], randomOrder: false, soundEnabled: false, autoNext: false });
    fireEvent.keyDown(window, { key: "a" });
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    fireEvent.click(screen.getByRole("button", { name: "Next ▶" }));
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByRole("img", { name: "Try again" })).toBeVisible();
    expect(screen.getByLabelText("Stars earned: 1")).toBeInTheDocument();
  });
});

describe("GamePage learning controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts zero and shows its empty quantity tray", async () => {
    renderGamePage({ contentType: "numbers" });
    expect(screen.getByText("Press any number!")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "0" });
    expect(await screen.findByRole("button", { name: "Listen to number 0" })).toBeInTheDocument();
    expect(screen.getByText("Zero")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "0 dots" })).toBeEmptyDOMElement();
  });

  it("shows a countable number card while respecting picture and word settings", async () => {
    renderGamePage({ contentType: "numbers", showWords: false });
    fireEvent.keyDown(window, { key: "3" });
    const tray = await screen.findByRole("img", { name: "3 dots" });
    expect(tray.children).toHaveLength(3);
    expect(screen.queryByText("Three")).not.toBeInTheDocument();
  });

  it("keeps the free-play word and picture after feedback finishes", async () => {
    renderGamePage({ caseMode: "uppercase" });
    fireEvent.keyDown(window, { key: "a" });
    await waitFor(() => expect(audioService.playWordSound).toHaveBeenCalled());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1900)); });
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("🍎")).toBeInTheDocument();
  });

  it("replays the letter and word from their accessible buttons", async () => {
    renderGamePage({ caseMode: "uppercase" });
    fireEvent.keyDown(window, { key: "a" });
    await waitFor(() => expect(audioService.playWordSound).toHaveBeenCalled());
    vi.clearAllMocks();
    fireEvent.click(screen.getByRole("button", { name: "Listen to letter A" }));
    expect(audioService.playLetterSound).toHaveBeenCalledWith("A", "us");
    fireEvent.click(screen.getByRole("button", { name: "Listen to Apple" }));
    expect(audioService.playWordSound).toHaveBeenCalledWith("Apple", "apple", "us");
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(screen.getByRole("button", { name: "Listen to letter A" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Listen to Apple" })).toBeDisabled();
  });

  it.each([
    { soundEnabled: false },
    { letterSpeechEnabled: false },
    { volume: 0 },
  ])("reveals the listen target when sound is unavailable: %j", async (patch) => {
    renderGamePage({ mode: "listen-and-find", enabledLetters: ["A"], caseMode: "uppercase", ...patch });
    expect(await screen.findByRole("button", { name: "Listen to letter A" })).toBeInTheDocument();
    expect(screen.getByText("Sound is off. Look at the letter and press its key.")).toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
  });

  it("keeps the listen target hidden until the child answers", async () => {
    renderGamePage({ mode: "listen-and-find", enabledLetters: ["A"], caseMode: "uppercase" });
    await waitFor(() => expect(audioService.playLetterSound).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Listen to letter A" })).not.toBeInTheDocument();
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "a" });
    expect(await screen.findByRole("button", { name: "Listen to letter A" })).toBeInTheDocument();
  });
});

describe("mixed learning content", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("shows lowercase letter pictures and numeric quantities in the same free-play session", async () => {
    renderGamePage({ contentType: "mixed", caseMode: "lowercase" });
    expect(screen.getByText("Press any letter or number!")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "a" });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByRole("button", { name: "Listen to letter a" })).toBeVisible();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(audioService.playWordSound).toHaveBeenCalledWith("Apple", "apple", "us");
    fireEvent.keyDown(window, { key: "0" });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(screen.getByRole("button", { name: "Listen to number 0" })).toBeVisible();
    expect(screen.getByRole("img", { name: "0 dots" })).toBeEmptyDOMElement();
    expect(screen.getByText("Zero")).toBeInTheDocument();
    expect(audioService.playLetterSound).toHaveBeenLastCalledWith("0", "us");
    expect(audioService.playWordSound).toHaveBeenCalledTimes(1);
  });

  it("switches guided item labels and gives a numeric keyboard hint for a digit target", async () => {
    renderGamePage({ contentType: "mixed", mode: "find-letter", caseMode: "uppercase", enabledLetters: ["A"], enabledNumbers: ["0"], randomOrder: false, soundEnabled: false, autoNext: false });
    expect(screen.getByText("Find the Key")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "a" });
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    fireEvent.click(screen.getByRole("button", { name: "Next ▶" }));
    expect(screen.getByRole("button", { name: "Listen to number 0" })).toBeVisible();
    fireEvent.keyDown(window, { key: "b" });
    await act(async () => { await vi.advanceTimersByTimeAsync(850); });
    fireEvent.keyDown(window, { key: "c" });
    const hint = screen.getByRole("img", { name: "Keyboard hint" });
    expect(hint.querySelector('[data-highlighted="true"]')).toHaveTextContent("0");
    expect(hint.querySelector(".keyboard-hint__row")?.textContent).toBe("1234567890");
    expect(screen.getByLabelText("Stars earned: 1")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(60); });
    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByRole("img", { name: "Correct! Star earned" })).toBeVisible();
    expect(screen.getByLabelText("Stars earned: 2")).toBeInTheDocument();
  });
});
