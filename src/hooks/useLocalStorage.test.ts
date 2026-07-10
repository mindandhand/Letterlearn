import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "./useLocalStorage";

describe("useLocalStorage", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("initializes from an existing localStorage value", () => {
    window.localStorage.setItem("test-key", JSON.stringify({ count: 5 }));
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));
    expect(result.current[0]).toEqual({ count: 5 });
  });

  it("falls back to the default value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("missing-key", { count: 0 }));
    expect(result.current[0]).toEqual({ count: 0 });
  });

  it("writes updates to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));
    act(() => {
      result.current[1]({ count: 42 });
    });
    expect(result.current[0]).toEqual({ count: 42 });
    expect(JSON.parse(window.localStorage.getItem("test-key") ?? "null")).toEqual({ count: 42 });
  });

  it("supports functional updates that read the previous value", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", { count: 0 }));
    act(() => {
      result.current[1]((previous) => ({ count: previous.count + 1 }));
    });
    act(() => {
      result.current[1]((previous) => ({ count: previous.count + 1 }));
    });
    expect(result.current[0]).toEqual({ count: 2 });
  });
});
