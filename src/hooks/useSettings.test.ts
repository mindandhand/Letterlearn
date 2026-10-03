import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSettings } from "./useSettings";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";

describe("learning content settings", () => {
  beforeEach(() => window.localStorage.clear());

  it("preserves persisted mixed settings while repairing case match and each range", () => {
    window.localStorage.setItem("letter-learn:settings", JSON.stringify({
      ...DEFAULT_SETTINGS, contentType: "mixed", mode: "case-match", caseMode: "lowercase",
      enabledLetters: ["O", "O", "0"], enabledNumbers: ["0", "0", "O"],
    }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toMatchObject({
      contentType: "mixed", mode: "find-letter", caseMode: "lowercase", enabledLetters: ["O"], enabledNumbers: ["0"],
    });
    act(() => result.current.updateSettings({ contentType: "numbers" }));
    act(() => result.current.updateSettings({ contentType: "letters" }));
    act(() => result.current.updateSettings({ contentType: "mixed" }));
    expect(result.current.settings.enabledLetters).toEqual(["O"]);
    expect(result.current.settings.enabledNumbers).toEqual(["0"]);
    expect(JSON.parse(window.localStorage.getItem("letter-learn:settings")!).contentType).toBe("mixed");
  });

  it("repairs invalid mixed ranges using each category's settings default", () => {
    window.localStorage.setItem("letter-learn:settings", JSON.stringify({
      ...DEFAULT_SETTINGS, contentType: "mixed", enabledLetters: ["0"], enabledNumbers: ["O", "10"],
    }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.contentType).toBe("mixed");
    expect(result.current.settings.enabledLetters).toEqual(DEFAULT_SETTINGS.enabledLetters);
    expect(result.current.settings.enabledNumbers).toEqual(DEFAULT_SETTINGS.enabledNumbers);
  });

  it("migrates saved letter settings without losing the selected case or range", () => {
    window.localStorage.setItem("letter-learn:settings", JSON.stringify({
      mode: "free-play", caseMode: "lowercase", enabledLetters: ["F", "G"], volume: 0.4,
    }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toMatchObject({
      contentType: "letters", caseMode: "lowercase", enabledLetters: ["F", "G"], volume: 0.4,
      enabledNumbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    });
  });

  it("starts new learners in uppercase and keeps separate letter and number ranges", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.caseMode).toBe("uppercase");
    act(() => result.current.updateSettings({ mode: "case-match", enabledLetters: ["B"] }));
    act(() => result.current.updateSettings({ contentType: "numbers", enabledNumbers: ["0", "3"] }));
    expect(result.current.settings.mode).toBe("find-letter");
    expect(result.current.settings.enabledLetters).toEqual(["B"]);
    act(() => result.current.updateSettings({ contentType: "letters" }));
    expect(result.current.settings.enabledNumbers).toEqual(["0", "3"]);
    expect(JSON.parse(window.localStorage.getItem("letter-learn:settings")!).contentType).toBe("letters");
  });

  it("repairs invalid and empty saved ranges and an incompatible numeric mode", () => {
    window.localStorage.setItem("letter-learn:settings", JSON.stringify({
      ...DEFAULT_SETTINGS, contentType: "numbers", mode: "case-match",
      enabledNumbers: ["A", "10", "0", "0"], enabledLetters: [],
    }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.mode).toBe("find-letter");
    expect(result.current.settings.enabledNumbers).toEqual(["0"]);
    expect(result.current.settings.enabledLetters).toEqual(["A", "B", "C"]);
  });

  it("recovers from a saved null settings value", () => {
    window.localStorage.setItem("letter-learn:settings", "null");
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});
