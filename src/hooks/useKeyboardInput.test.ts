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
    const onLetterPress = vi.fn();
    renderHook(() => useKeyboardInput({ enabled: true, onLetterPress }));

    // Caps Lock on: browsers report an uppercase `key` even though the
    // physical key pressed is the same. Lowercase input should resolve
    // identically via toLowerCase() normalization.
    dispatchKey({ key: "B" });
    dispatchKey({ key: "b" });

    expect(onLetterPress).toHaveBeenNthCalledWith(1, "B");
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
