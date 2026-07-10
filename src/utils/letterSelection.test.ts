import { describe, expect, it, vi } from "vitest";
import { pickIsUppercase, pickNextLetter } from "./letterSelection";
import type { ProgressRecord } from "../types/game";

describe("pickNextLetter", () => {
  it("never repeats the same letter twice in a row when multiple letters are enabled", () => {
    const letters = ["A", "B", "C"];
    let lastLetter: string | null = null;
    for (let i = 0; i < 200; i += 1) {
      const next = pickNextLetter(letters, {}, lastLetter);
      expect(next).not.toBe(lastLetter);
      lastLetter = next;
    }
  });

  it("returns the only letter immediately without looping when just one letter is enabled", () => {
    const result = pickNextLetter(["A"], {}, "A");
    expect(result).toBe("A");
  });

  it("throws when the enabled letter list is empty", () => {
    expect(() => pickNextLetter([], {}, null)).toThrow();
  });

  it("favors a letter the child recently missed over one they know well", () => {
    const progress: ProgressRecord = {
      A: { attempts: 5, correct: 1, mistakes: 4, currentStreak: 0, bestStreak: 1 },
      B: { attempts: 5, correct: 5, mistakes: 0, currentStreak: 5, bestStreak: 5 },
    };
    // Roll values are consumed in pool order; pool excludes the last letter only
    // when more than one candidate remains, so with lastLetter unset both letters
    // are eligible and weights are A=4, B=0.5, total=4.5. A very small roll should
    // land on A given its much larger share of the weighted range.
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.01);
    try {
      const next = pickNextLetter(["A", "B"], progress, null);
      expect(next).toBe("A");
    } finally {
      randomSpy.mockRestore();
    }
  });
});

describe("pickIsUppercase", () => {
  it("always returns true for uppercase-only mode", () => {
    expect(pickIsUppercase("uppercase")).toBe(true);
  });

  it("always returns false for lowercase-only mode", () => {
    expect(pickIsUppercase("lowercase")).toBe(false);
  });

  it("returns both outcomes for mixed mode depending on randomness", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy.mockReturnValue(0.1);
    expect(pickIsUppercase("mixed")).toBe(true);
    randomSpy.mockReturnValue(0.9);
    expect(pickIsUppercase("mixed")).toBe(false);
    randomSpy.mockRestore();
  });
});
