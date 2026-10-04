import { afterEach, describe, expect, it, vi } from "vitest";
import { createLetterPicker, pickIsUppercase } from "./letterSelection";

afterEach(() => vi.restoreAllMocks());

describe("shuffled letter selection", () => {
  it("covers every selected key exactly once per cycle", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    const pick = createLetterPicker();
    const keys = ["A", "B", "C", "0", "1"];
    let last: string | null = null;
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const drawn: string[] = [];
      for (let i = 0; i < keys.length; i += 1) {
        const next = pick(keys, last);
        expect(next).not.toBe(last);
        drawn.push(next);
        last = next;
      }
      expect(drawn.slice().sort()).toEqual(keys.slice().sort());
    }
    expect(keys).toEqual(["A", "B", "C", "0", "1"]);
  });

  it("avoids repeating the previous cycle's final key", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const pick = createLetterPicker();
    expect(pick(["A", "B", "C"], null)).toBe("A");
    expect(pick(["A", "B", "C"], "A")).toBe("B");
    expect(pick(["A", "B", "C"], "B")).toBe("C");
    random.mockReturnValue(0.999);
    expect(pick(["A", "B", "C"], "C")).not.toBe("C");
  });

  it("rebuilds the pool when the range changes and keeps separate sessions independent", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const pick = createLetterPicker();
    expect(pick(["A", "B", "C"], null)).toBe("A");
    expect(pick(["X", "Y"], "A")).toBe("X");
    expect(pick(["X", "Y"], "X")).toBe("Y");
    expect(createLetterPicker()(["A", "B", "C"], null)).toBe("A");
  });

  it("handles a single enabled key and rejects an empty range", () => {
    const pick = createLetterPicker();
    expect(pick(["A"], "A")).toBe("A");
    expect(pick(["A"], "A")).toBe("A");
    expect(() => pick([], null)).toThrow();
  });
});

describe("pickIsUppercase", () => {
  it("respects fixed case modes", () => {
    expect(pickIsUppercase("uppercase")).toBe(true);
    expect(pickIsUppercase("lowercase")).toBe(false);
  });

  it("returns both outcomes for mixed mode depending on randomness", () => {
    const random = vi.spyOn(Math, "random");
    random.mockReturnValue(0.1);
    expect(pickIsUppercase("mixed")).toBe(true);
    random.mockReturnValue(0.9);
    expect(pickIsUppercase("mixed")).toBe(false);
  });
});
