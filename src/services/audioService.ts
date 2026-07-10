import type { AccentId } from "../types/game";

type EffectType = "correct" | "incorrect" | "click" | "celebration";

interface SpeakOptions {
  accent?: AccentId;
  rate?: number;
  pitch?: number;
}

const ACCENT_LANG: Record<AccentId, string> = {
  us: "en-US",
  gb: "en-GB",
};

const AUDIO_BASE = "/audio";

const MUSIC_NOTES_HZ = [392.0, 440.0, 523.25, 587.33, 659.25];
const MUSIC_NOTE_INTERVAL_MS = 900;
const MUSIC_DEFAULT_GAIN = 0.05;
const MUSIC_DUCK_GAIN = 0.015;

// Chromium has a known timing bug where calling speechSynthesis.speak()
// in the same tick as cancel() silently drops the utterance — it never
// fires 'end' or 'error', so any code awaiting it hangs forever. A short
// delay before speaking lets the cancel settle first.
const SPEAK_QUEUE_DELAY_MS = 50;
// Absolute safety net: if speech synthesis never fires end/error at all
// (unsupported voice, OS-level TTS failure, other browser bugs), resolve
// anyway so the game never gets stuck waiting on narration.
const SPEAK_FAILSAFE_TIMEOUT_MS = 4000;

function getAudioContextClass(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/**
 * Plays pre-recorded voice clips (public/audio/{accent}/...) for every
 * letter and word, generated once via scripts/generate-audio.sh. Real
 * audio files are far more reliable than live SpeechSynthesis (which has
 * inconsistent voice availability and browser timing bugs — see the
 * cancel/speak race handled below) and sound better to a child. Live
 * speech synthesis is kept only as an automatic fallback for instructional
 * phrases and for the rare case a clip fails to load.
 */
class AudioService {
  private audioContext: AudioContext | undefined;
  private musicGain: GainNode | undefined;
  private musicTimer: ReturnType<typeof setInterval> | undefined;
  private musicNoteIndex = 0;
  private volume = 0.8;
  private speaking = false;
  private speechToken = 0;
  private currentClip: HTMLAudioElement | undefined;
  private playToken = 0;

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
    return typeof window !== "undefined" && "speechSynthesis" in window;
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
    this.speechToken += 1;
    this.playToken += 1;
    if (this.currentClip) {
      this.currentClip.onended = null;
      this.currentClip.onerror = null;
      this.currentClip.pause();
      this.currentClip = undefined;
    }
    if (this.isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    this.speaking = false;
    this.restoreMusicGain();
  }

  playLetterSound(letter: string, accent: AccentId): Promise<void> {
    // Lowercase fallback text: some speech engines read a bare isolated
    // uppercase letter as "Capital X" instead of just the letter name.
    return this.playClip(`letter-${letter.toUpperCase()}`, accent, letter.toLowerCase());
  }

  playWordSound(word: string, audioSlug: string, accent: AccentId): Promise<void> {
    return this.playClip(`word-${audioSlug}`, accent, word);
  }

  playPromptSound(letter: string, accent: AccentId): Promise<void> {
    return this.playClip(`prompt-${letter.toUpperCase()}`, accent, `Press ${letter}.`, { rate: 0.9 });
  }

  playPairSound(letter: string, accent: AccentId): Promise<void> {
    const upper = letter.toUpperCase();
    return this.playClip(
      `pair-${upper}`,
      accent,
      `Uppercase ${upper}, lowercase ${upper.toLowerCase()}.`,
      { rate: 0.9 },
    );
  }

  playTestSound(accent: AccentId): Promise<void> {
    return this.playClip("test-sound", accent, "Hello! This is how I sound.");
  }

  /** Plays a pre-recorded clip, falling back to speech synthesis if it fails to load. */
  private playClip(
    clipName: string,
    accent: AccentId,
    fallbackText: string,
    fallbackOptions: SpeakOptions = {},
  ): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.resolve();
    }
    this.playToken += 1;
    const token = this.playToken;

    if (this.currentClip) {
      this.currentClip.onended = null;
      this.currentClip.onerror = null;
      this.currentClip.pause();
      this.currentClip = undefined;
    }

    return new Promise((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        if (token === this.playToken) {
          this.speaking = false;
          this.restoreMusicGain();
        }
        resolve();
      };

      const fallbackToSynthesis = (): void => {
        void this.speakWithSynthesis(fallbackText, { accent, ...fallbackOptions }).then(finish);
      };

      const audio = new Audio(`${AUDIO_BASE}/${accent}/${clipName}.m4a`);
      audio.volume = this.volume;
      this.currentClip = audio;
      this.speaking = true;
      this.duckMusicGain();

      audio.onended = finish;
      audio.onerror = fallbackToSynthesis;

      audio.play().catch(fallbackToSynthesis);
    });
  }

  private speakWithSynthesis(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.isSpeechSupported()) {
      return Promise.resolve();
    }
    window.speechSynthesis.cancel();
    this.speechToken += 1;
    const token = this.speechToken;

    return new Promise((resolve) => {
      let settled = false;
      let failsafeTimer: ReturnType<typeof setTimeout> | undefined;

      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearTimeout(failsafeTimer);
        this.speaking = false;
        this.restoreMusicGain();
        resolve();
      };

      setTimeout(() => {
        // A newer speak()/cancelSpeech() call superseded this one while it
        // was waiting out the queue delay — drop it instead of talking over
        // the new utterance.
        if (token !== this.speechToken) {
          finish();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = ACCENT_LANG[options.accent ?? "us"];
        utterance.rate = options.rate ?? 0.9;
        utterance.pitch = options.pitch ?? 1.05;
        utterance.volume = this.volume;

        this.speaking = true;
        this.duckMusicGain();
        utterance.onend = finish;
        utterance.onerror = finish;
        failsafeTimer = setTimeout(finish, SPEAK_FAILSAFE_TIMEOUT_MS);

        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          finish();
        }
      }, SPEAK_QUEUE_DELAY_MS);
    });
  }

  playEffect(type: EffectType): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime;
    const patterns: Record<EffectType, Array<[number, number]>> = {
      correct: [
        [523.25, 0.1],
        [659.25, 0.12],
      ],
      incorrect: [[220, 0.18]],
      click: [[440, 0.05]],
      celebration: [
        [523.25, 0.08],
        [659.25, 0.08],
        [783.99, 0.16],
      ],
    };
    const notes = patterns[type];
    let startAt = now;
    for (const [freq, duration] of notes) {
      this.playTone(ctx, freq, startAt, duration);
      startAt += duration;
    }
  }

  private playTone(ctx: AudioContext, frequency: number, startAt: number, duration: number): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.25 * this.volume, startAt + 0.02);
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
export type { EffectType, SpeakOptions };
