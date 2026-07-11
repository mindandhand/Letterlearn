import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaultSettings";

describe("DEFAULT_SETTINGS", () => {
  it("starts new learners with a small A-C practice range", () => {
    expect(DEFAULT_SETTINGS.enabledLetters).toEqual(["A", "B", "C"]);
  });
});
