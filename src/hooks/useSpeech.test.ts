import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeech } from "./useSpeech";
import { audioService } from "../services/audioService";
import type { GameSettings } from "../types/game";

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
  mode: "free-play",
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
  autoNextDelayMs: 500,
  reducedMotion: false,
  showWords: true,
  showEmoji: true,
};

describe("useSpeech", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls audioService when sound is enabled", async () => {
    const { result } = renderHook(() => useSpeech(baseSettings));
    await result.current.playLetterSound("A");
    await result.current.playPhonicsSound("A");
    await result.current.playCorrectSound("A");
    await result.current.playHintSound("A");
    expect(audioService.playLetterSound).toHaveBeenCalledWith("A", "us");
    expect(audioService.playPhonicsSound).toHaveBeenCalledWith("A", "us");
    expect(audioService.playCorrectSound).toHaveBeenCalledWith("A", "us");
    expect(audioService.playHintSound).toHaveBeenCalledWith("A", "us");
  });

  it("does not call audioService for letter/word sounds when the master sound switch is off", async () => {
    const settings: GameSettings = { ...baseSettings, soundEnabled: false };
    const { result } = renderHook(() => useSpeech(settings));

    await result.current.playLetterSound("A");
    await result.current.playPhonicsSound("A");
    await result.current.playCorrectSound("A");
    await result.current.playHintSound("A");
    await result.current.playWordSound("Apple", "apple");
    await result.current.playPromptSound("A");
    await result.current.playPairSound("A");
    await result.current.playTestSound();
    result.current.playEffect("correct");

    expect(audioService.playLetterSound).not.toHaveBeenCalled();
    expect(audioService.playPhonicsSound).not.toHaveBeenCalled();
    expect(audioService.playCorrectSound).not.toHaveBeenCalled();
    expect(audioService.playHintSound).not.toHaveBeenCalled();
    expect(audioService.playWordSound).not.toHaveBeenCalled();
    expect(audioService.playPromptSound).not.toHaveBeenCalled();
    expect(audioService.playPairSound).not.toHaveBeenCalled();
    expect(audioService.playTestSound).not.toHaveBeenCalled();
    expect(audioService.playEffect).not.toHaveBeenCalled();
  });

  it("does not call audioService for letter sounds when only letter speech is disabled", async () => {
    const settings: GameSettings = { ...baseSettings, letterSpeechEnabled: false };
    const { result } = renderHook(() => useSpeech(settings));

    await result.current.playLetterSound("A");
    await result.current.playPhonicsSound("A");
    await result.current.playCorrectSound("A");
    await result.current.playHintSound("A");

    expect(audioService.playLetterSound).not.toHaveBeenCalled();
    expect(audioService.playPhonicsSound).not.toHaveBeenCalled();
    expect(audioService.playCorrectSound).not.toHaveBeenCalled();
    expect(audioService.playHintSound).not.toHaveBeenCalled();
  });
});
