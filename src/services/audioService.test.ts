import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioService } from "./audioService";

class FakeAudio {
  static instances: FakeAudio[] = [];
  volume = 1;
  paused = true;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  rejectPlay!: (reason: Error) => void;
  readonly src: string;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.paused = false;
    return new Promise((_resolve, reject) => {
      this.rejectPlay = reject;
    });
  }

  pause(): void {
    this.paused = true;
  }
}

describe("audioService answer effects", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([0.8, 0.4, 0])("plays distinct short answer tones at master volume %s", async (volume) => {
    const oscillators: Array<{
      type: string;
      frequency: { value: number };
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const gains: Array<{
      gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
      connect: ReturnType<typeof vi.fn>;
    }> = [];
    class FakeAudioContext {
      currentTime = 10;
      destination = {};
      createOscillator() {
        const oscillator = { type: "", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
        gains.push(gain);
        return gain;
      }
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.resetModules();
    const { audioService: service } = await import("./audioService");
    service.setVolume(volume);
    service.playEffect("correct");
    expect(oscillators).toHaveLength(1);
    service.playEffect("incorrect");
    expect(oscillators).toHaveLength(2);

    expect(oscillators[0].frequency.value).toBeGreaterThan(oscillators[1].frequency.value);
    const peaks = gains.map((gain) => gain.gain.linearRampToValueAtTime.mock.calls[0][0] as number);
    expect(peaks[0]).toBeCloseTo(0.25 * volume);
    expect(peaks[1]).toBeCloseTo(0.12 * volume);
    if (volume > 0) expect(peaks[1]).toBeLessThan(peaks[0]);
    for (const [index, oscillator] of oscillators.entries()) {
      expect(oscillator.type).toBe("sine");
      expect(oscillator.start).toHaveBeenCalledWith(10);
      const stop = oscillator.stop.mock.calls[0][0] as number;
      expect(stop).toBeGreaterThan(10);
      expect(stop).toBeLessThanOrEqual(10.3);
      expect(gains[index].gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
      const [endVolume, endTime] = gains[index].gain.linearRampToValueAtTime.mock.calls[1];
      expect(endVolume).toBe(0);
      expect(endTime).toBeGreaterThan(10.02);
      expect(endTime).toBeLessThan(stop);
    }
  });
});

describe("audioService clip lifecycle", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    audioService.cancelSpeech();
    audioService.setVolume(0.8);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(["us", "gb"] as const)("uses standalone number clips for every digit in %s", async (accent) => {
    for (let digit = 0; digit <= 9; digit += 1) {
      for (const play of [audioService.playLetterSound.bind(audioService), audioService.playPromptSound.bind(audioService)]) {
        const playback = play(String(digit), accent);
        const clip = FakeAudio.instances.at(-1)!;
        expect(clip.src).toBe(`/audio/${accent}/number-${digit}.m4a`);
        clip.onended?.();
        await playback;
      }
    }
  });

  it("keeps alphabet prompt and letter paths unchanged", async () => {
    const letter = audioService.playLetterSound("a", "us");
    expect(FakeAudio.instances.at(-1)!.src).toBe("/audio/us/letter-A.m4a");
    FakeAudio.instances.at(-1)!.onended?.();
    await letter;
    const prompt = audioService.playPromptSound("b", "gb");
    expect(FakeAudio.instances.at(-1)!.src).toBe("/audio/gb/prompt-B.m4a");
    FakeAudio.instances.at(-1)!.onended?.();
    await prompt;
  });

  it("settles playback when explicitly cancelled", async () => {
    const settled = vi.fn();
    void audioService.playCorrectSound("A", "us").then(settled);
    const clip = FakeAudio.instances[0];

    audioService.cancelSpeech();
    await Promise.resolve();

    expect(settled).toHaveBeenCalledOnce();
    expect(clip.paused).toBe(true);
    expect(clip.onended).toBeNull();
    expect(clip.onerror).toBeNull();
  });

  it("settles replaced playback and keeps only the replacement playing", async () => {
    const firstSettled = vi.fn();
    const secondSettled = vi.fn();
    void audioService.playCorrectSound("A", "us").then(firstSettled);
    const first = FakeAudio.instances[0];
    const staleEnd = first.onended;
    const staleError = first.onerror;
    void audioService.playLetterSound("B", "gb").then(secondSettled);
    const second = FakeAudio.instances[1];
    await Promise.resolve();

    expect(firstSettled).toHaveBeenCalledOnce();
    expect(first.paused).toBe(true);
    expect(second.paused).toBe(false);
    expect(second.src).toBe("/audio/gb/letter-B.m4a");

    staleEnd?.();
    staleError?.();
    first.rejectPlay(new Error("Delayed cancellation rejection"));
    await Promise.resolve();
    expect(secondSettled).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();

    audioService.setVolume(0.3);
    expect(second.volume).toBe(0.3);
    audioService.cancelSpeech();
    await Promise.resolve();
    expect(second.paused).toBe(true);
    expect(secondSettled).toHaveBeenCalledOnce();
  });

  it.each(["ended", "error", "rejection"] as const)("cleans up and settles after %s", async (event) => {
    const playback = audioService.playLetterSound("C", "us");
    const clip = FakeAudio.instances[0];
    if (event === "ended") clip.onended?.();
    if (event === "error") clip.onerror?.();
    if (event === "rejection") clip.rejectPlay(new Error("Cannot play"));
    await playback;

    expect(clip.onended).toBeNull();
    expect(clip.onerror).toBeNull();
    expect(clip.paused).toBe(true);
    audioService.setVolume(0.2);
    expect(clip.volume).toBe(0.8);
  });
});
