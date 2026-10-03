import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardInput } from "./useKeyboardInput";

function dispatchKey(init: KeyboardEventInit): void {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

describe("useKeyboardInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a letter key press as an uppercase letter", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    dispatchKey({ key: "a" });

    expect(onLetterPress).toHaveBeenCalledWith("A");
  });

  it("ignores non-letter keys", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    dispatchKey({ key: "5" });
    dispatchKey({ key: "Enter" });
    dispatchKey({ key: " " });
    dispatchKey({ key: "!" });

    expect(onLetterPress).not.toHaveBeenCalled();
  });

  it("ignores letter keys combined with Ctrl, Alt, or Meta", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    dispatchKey({ key: "a", ctrlKey: true });
    dispatchKey({ key: "a", altKey: true });
    dispatchKey({ key: "a", metaKey: true });

    expect(onLetterPress).not.toHaveBeenCalled();
  });

  it("ignores repeated keydown events from a held key", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    dispatchKey({ key: "a", repeat: true });

    expect(onLetterPress).not.toHaveBeenCalled();
  });

  it("recognizes the letter the same way regardless of Caps Lock (via event.key casing)", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    // Caps Lock on: browsers report an uppercase `key` even though the
    // physical key pressed is the same. Lowercase input should resolve
    // identically via toLowerCase() normalization.
    dispatchKey({ key: "B" });
    clock.mockReturnValue(1050);
    dispatchKey({ key: "b" });

    expect(onLetterPress).toHaveBeenNthCalledWith(1, "B");
    expect(onLetterPress).toHaveBeenNthCalledWith(2, "B");
  });

  it("debounces rapid presses and accepts the next press after the cooldown", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    dispatchKey({ key: "a" });
    clock.mockReturnValue(1020);
    dispatchKey({ key: "b" });
    expect(onLetterPress).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(1050);
    dispatchKey({ key: "b" });
    expect(onLetterPress).toHaveBeenNthCalledWith(2, "B");
  });

  it("does not invoke the callback while disabled", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: false, onLetterPress }));

    dispatchKey({ key: "a" });

    expect(onLetterPress).not.toHaveBeenCalled();
  });

  it("removes its listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const onLetterPress = vi.fn();
    const { unmount } = renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    unmount();
    dispatchKey({ key: "a" });

    expect(onLetterPress).not.toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("does not register duplicate listeners when re-rendered with the same enabled state", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const onLetterPress = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardInput({ enabled, onLetterPress }),
      { initialProps: { enabled: true } },
    );
    const callsAfterMount = addSpy.mock.calls.filter(([type]) => type === "keydown").length;

    rerender({ enabled: true });
    const callsAfterRerender = addSpy.mock.calls.filter(([type]) => type === "keydown").length;

    expect(callsAfterRerender).toBe(callsAfterMount);
  });
});


describe("number keyboard input", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts zero and a NumLock-enabled numpad digit using event.key", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, contentType: "numbers", onLetterPress }));
    dispatchKey({ key: "0", code: "Digit0" });
    clock.mockReturnValue(1100);
    dispatchKey({ key: "7", code: "Numpad7" });
    expect(onLetterPress.mock.calls).toEqual([["0"], ["7"]]);
  });

  it("ignores letters, symbols, numpad navigation, repeats and modified digits without blocking the next digit", () => {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, contentType: "numbers", onLetterPress }));
    dispatchKey({ key: "a" });
    dispatchKey({ key: "!", code: "Digit1" });
    dispatchKey({ key: "Home", code: "Numpad7" });
    dispatchKey({ key: "2", repeat: true });
    dispatchKey({ key: "2", ctrlKey: true });
    dispatchKey({ key: "2", altKey: true });
    dispatchKey({ key: "2", metaKey: true });
    dispatchKey({ key: "2" });
    expect(onLetterPress.mock.calls).toEqual([["2"]]);
  });

  it("updates accepted keys when content changes", () => {
    const onLetterPress = vi.fn();
    const { rerender } = renderHook(({ numbers }) => useKeyboardInput({ enabled: true, contentType: numbers ? "numbers" : "letters", onLetterPress }), { initialProps: { numbers: false } });
    dispatchKey({ key: "0" });
    rerender({ numbers: true });
    dispatchKey({ key: "0" });
    expect(onLetterPress.mock.calls).toEqual([["0"]]);
  });
});


it("accepts a shifted numeric character while rejecting shifted symbols", () => {
  const onLetterPress = vi.fn();
  renderHook(() => useKeyboardInput({ enabled: true, contentType: "numbers", onLetterPress }));
  dispatchKey({ key: "!", code: "Digit1", shiftKey: true });
  dispatchKey({ key: "0", code: "Digit0", shiftKey: true });
  expect(onLetterPress.mock.calls).toEqual([["0"]]);
});


it("accepts letters and literal zero in mixed mode while ignoring modifiers and symbols", () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
  try {
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, contentType: "mixed", onLetterPress }));
    dispatchKey({ key: "a", ctrlKey: true });
    dispatchKey({ key: "0", altKey: true });
    dispatchKey({ key: "a", metaKey: true });
    dispatchKey({ key: "!", shiftKey: true });
    dispatchKey({ key: "0", repeat: true });
    dispatchKey({ key: "a" });
    clock.mockReturnValue(1100);
    dispatchKey({ key: "0", code: "Numpad0" });
    expect(onLetterPress.mock.calls).toEqual([["A"], ["0"]]);
  } finally { clock.mockRestore(); }
});
