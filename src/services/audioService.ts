import type { AccentId } from "../types/game";

type EffectType = "correct" | "incorrect" | "click" | "celebration";

const AUDIO_BASE = "/audio";

const MUSIC_NOTES_HZ = [392.0, 440.0, 523.25, 587.33, 659.25];
const MUSIC_NOTE_INTERVAL_MS = 900;
const MUSIC_DEFAULT_GAIN = 0.05;
const MUSIC_DUCK_GAIN = 0.015;

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/**
 * Plays pre-recorded voice clips from public/audio/{accent}/...
 * SpeechSynthesis is intentionally not used as a fallback: missing clips
 * should be replaced with real recordings rather than a robotic voice.
 */
class AudioService {
  private audioContext: AudioContext | undefined;
  private musicGain: GainNode | undefined;
  private musicTimer: ReturnType<typeof setInterval> | undefined;
  private musicNoteIndex = 0;
  private volume = 0.8;
  private speaking = false;
  private currentClip: HTMLAudioElement | undefined;
  private finishCurrentClip: (() => void) | undefined;
  private missingClipWarnings = new Set<string>();

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentClip) {
      this.currentClip.volume = this.volume;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.speaking
        ? MUSIC_DUCK_GAIN * this.volume
        : MUSIC_DEFAULT_GAIN * this.volume;
    }
  }

  isSpeechSupported(): boolean {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }

  private ensureAudioContext(): AudioContext | undefined {
    if (this.audioContext) {
      return this.audioContext;
    }
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      return undefined;
    }
    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  /** Must be called from a user gesture handler to satisfy autoplay policies. */
  unlockAudio(): void {
    const ctx = this.ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  cancelSpeech(): void {
    this.finishCurrentClip?.();
    this.speaking = false;
    this.restoreMusicGain();
  }

  playLetterSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(/^[0-9]$/.test(letter) ? `number-${letter}` : `letter-${letter.toUpperCase()}`, accent);
  }

  playPhonicsSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(`sound-${letter.toUpperCase()}`, accent);
  }

  playCorrectSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(`correct-${letter.toUpperCase()}`, accent);
  }

  playHintSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(`hint-${letter.toUpperCase()}`, accent);
  }

  playWordSound(_word: string, audioSlug: string, accent: AccentId): Promise<void> {
    return this.playClip(`word-${audioSlug}`, accent);
  }

  playPromptSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(/^[0-9]$/.test(letter) ? `number-${letter}` : `prompt-${letter.toUpperCase()}`, accent);
  }

  playPairSound(letter: string, accent: AccentId): Promise<void> {
    const upper = letter.toUpperCase();
    return this.playClip(`pair-${upper}`, accent);
  }

  playTestSound(accent: AccentId): Promise<void> {
    return this.playClip("test-sound", accent);
  }

  private playClip(clipName: string, accent: AccentId): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    this.cancelSpeech();

    return new Promise((resolve) => {
      const audio = new Audio(`${AUDIO_BASE}/${accent}/${clipName}.m4a`);
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        if (this.currentClip === audio) {
          this.currentClip = undefined;
          this.finishCurrentClip = undefined;
          this.speaking = false;
          this.restoreMusicGain();
        }
        resolve();
      };

      const handleMissingClip = (): void => {
        if (settled) return;
        this.warnMissingClip(`${accent}/${clipName}.m4a`);
        finish();
      };

      audio.volume = this.volume;
      this.currentClip = audio;
      this.finishCurrentClip = finish;
      this.speaking = true;
      this.duckMusicGain();

      audio.onended = finish;
      audio.onerror = handleMissingClip;

      audio.play().catch(handleMissingClip);
    });
  }

  private warnMissingClip(path: string): void {
    if (!import.meta.env.DEV || this.missingClipWarnings.has(path)) {
      return;
    }
    this.missingClipWarnings.add(path);
    console.warn(`Missing real voice clip: ${AUDIO_BASE}/${path}`);
  }

  playEffect(type: EffectType): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const patterns: Record<EffectType, Array<[number, number, number?]>> = {
      correct: [[880, 0.25]],
      incorrect: [[196, 0.16, 0.12]],
      click: [[440, 0.05]],
      celebration: [
        [523.25, 0.08],
        [659.25, 0.08],
        [783.99, 0.16],
      ],
    };
    const notes = patterns[type];
    let startAt = now;
    for (const [freq, duration, peakGain] of notes) {
      this.playTone(ctx, freq, startAt, duration, peakGain);
      startAt += duration;
    }
  }

  private playTone(ctx: AudioContext, frequency: number, startAt: number, duration: number, peakGain = 0.25): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain * this.volume, startAt + 0.02);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  private duckMusicGain(): void {
    if (this.musicGain) {
      this.musicGain.gain.value = MUSIC_DUCK_GAIN * this.volume;
    }
  }

  private restoreMusicGain(): void {
    if (this.musicGain) {
      this.musicGain.gain.value = MUSIC_DEFAULT_GAIN * this.volume;
    }
  }

  startMusic(): void {
    const ctx = this.ensureAudioContext();
    if (!ctx || this.musicTimer) {
      return;
    }
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.speaking
      ? MUSIC_DUCK_GAIN * this.volume
      : MUSIC_DEFAULT_GAIN * this.volume;
    this.musicGain.connect(ctx.destination);

    const playNote = (): void => {
      if (!this.musicGain || !this.audioContext) {
        return;
      }
      const freq = MUSIC_NOTES_HZ[this.musicNoteIndex % MUSIC_NOTES_HZ.length];
      this.musicNoteIndex += 1;
      const osc = this.audioContext.createOscillator();
      const noteGain = this.audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const now = this.audioContext.currentTime;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(1, now + 0.3);
      noteGain.gain.linearRampToValueAtTime(0, now + 1.4);
      osc.connect(noteGain);
      noteGain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1.5);
    };

    playNote();
    this.musicTimer = setInterval(playNote, MUSIC_NOTE_INTERVAL_MS);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = undefined;
    }
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = undefined;
    }
  }
}

export const audioService = new AudioService();
export type { EffectType };
