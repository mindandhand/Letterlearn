import { useCallback, useRef } from "react";
import { audioService, type EffectType } from "../services/audioService";
import type { GameSettings } from "../types/game";

/**
 * Wraps audioService with the current sound settings so callers never need
 * to check soundEnabled/letterSpeechEnabled/etc. themselves. Silently no-ops
 * (resolved promise) when sound is disabled.
 */
export function useSpeech(settings: GameSettings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const playLetterSound = useCallback((letter: string): Promise<void> => {
    const current = settingsRef.current;
    if (!current.soundEnabled || !current.letterSpeechEnabled) {
      return Promise.resolve();
    }
    return audioService.playLetterSound(letter, current.accent);
  }, []);

  const playWordSound = useCallback((word: string, audioSlug: string): Promise<void> => {
    const current = settingsRef.current;
    if (!current.soundEnabled || !current.wordSpeechEnabled) {
      return Promise.resolve();
    }
    return audioService.playWordSound(word, audioSlug, current.accent);
  }, []);

  const playPromptSound = useCallback((letter: string): Promise<void> => {
    const current = settingsRef.current;
    if (!current.soundEnabled || !current.letterSpeechEnabled) {
      return Promise.resolve();
    }
    return audioService.playPromptSound(letter, current.accent);
  }, []);

  const playPairSound = useCallback((letter: string): Promise<void> => {
    const current = settingsRef.current;
    if (!current.soundEnabled || !current.letterSpeechEnabled) {
      return Promise.resolve();
    }
    return audioService.playPairSound(letter, current.accent);
  }, []);

  const playTestSound = useCallback((): Promise<void> => {
    const current = settingsRef.current;
    if (!current.soundEnabled) {
      return Promise.resolve();
    }
    return audioService.playTestSound(current.accent);
  }, []);

  const playEffect = useCallback((type: EffectType): void => {
    const current = settingsRef.current;
    if (!current.soundEnabled || !current.effectsEnabled) {
      return;
    }
    audioService.playEffect(type);
  }, []);

  const stop = useCallback((): void => {
    audioService.cancelSpeech();
  }, []);

  const unlock = useCallback((): void => {
    audioService.unlockAudio();
  }, []);

  return {
    playLetterSound,
    playWordSound,
    playPromptSound,
    playPairSound,
    playTestSound,
    playEffect,
    stop,
    unlock,
    isSupported: audioService.isSpeechSupported(),
  };
}
