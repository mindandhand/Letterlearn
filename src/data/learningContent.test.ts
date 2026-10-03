import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { getEnabledKeys, getItemContentType, getLearningData } from "./learningContent";
import { ALL_LETTER_KEYS } from "./letters";
import { ALL_NUMBER_KEYS } from "./numbers";
import { loadProgress, recordAttempt, saveProgress } from "../services/progressService";

describe("number content and progress compatibility", () => {
  it("resolves mixed content by individual item without confusing zero and O", () => {
    expect(getItemContentType("0")).toBe("numbers");
    expect(getItemContentType("O")).toBe("letters");
    expect(getItemContentType("10")).toBe("letters");
    expect(getLearningData("0", "mixed")?.word).toBe("Zero");
    expect(getLearningData("O", "mixed")?.word).toBe("Orange");
    expect(getLearningData("10", "mixed")).toBeUndefined();
  });

  it("interleaves valid deduplicated mixed ranges and appends the longer remainder", () => {
    expect(getEnabledKeys({
      ...DEFAULT_SETTINGS, contentType: "mixed",
      enabledLetters: ["B", "B", "0", "A", "C"], enabledNumbers: ["0", "0", "O", "10", "9"],
    })).toEqual(["B", "0", "A", "9", "C"]);
    expect(getEnabledKeys({
      ...DEFAULT_SETTINGS, contentType: "mixed", enabledLetters: ["O"], enabledNumbers: ["0", "1", "2"],
    })).toEqual(["O", "0", "1", "2"]);
  });

  it("falls back independently for invalid mixed category ranges", () => {
    expect(getEnabledKeys({
      ...DEFAULT_SETTINGS, contentType: "mixed", enabledLetters: ["0"], enabledNumbers: ["9"],
    })).toEqual(["A", "9", ...ALL_LETTER_KEYS.slice(1)]);
    expect(getEnabledKeys({
      ...DEFAULT_SETTINGS, contentType: "mixed", enabledLetters: ["Z"], enabledNumbers: ["O", "10"],
    })).toEqual(["Z", ...ALL_NUMBER_KEYS]);
  });

  it("looks up zero as a number without confusing it with the letter O", () => {
    expect(getLearningData("0", "numbers")?.word).toBe("Zero");
    expect(getLearningData("O", "letters")?.word).toBe("Orange");
    expect(getLearningData("0", "letters")).toBeUndefined();
    expect(getLearningData("O", "numbers")).toBeUndefined();
  });

  it("filters number ranges and safely falls back when no valid numbers remain", () => {
    expect(getEnabledKeys({ ...DEFAULT_SETTINGS, contentType: "numbers", enabledNumbers: ["0", "0", "A", "10", "9"] })).toEqual(["0", "9"]);
    expect(getEnabledKeys({ ...DEFAULT_SETTINGS, contentType: "numbers", enabledNumbers: [] })).toEqual(ALL_NUMBER_KEYS);
  });

  it("persists digit practice alongside existing letter progress", () => {
    window.localStorage.clear();
    const letters = recordAttempt({}, "O", true);
    const numbers = recordAttempt(letters, "0", false);
    saveProgress(numbers);
    const restored = loadProgress();
    expect(restored.O).toEqual(letters.O);
    expect(restored["0"]).toMatchObject({ attempts: 1, mistakes: 1, correct: 0 });
    window.localStorage.clear();
  });
});
