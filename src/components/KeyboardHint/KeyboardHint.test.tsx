import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyboardHint } from "./KeyboardHint";

describe("KeyboardHint", () => {
  it("shows physical QWERTY rows and highlights the same key for lowercase targets", () => {
    render(<KeyboardHint target="b" contentType="letters" />);
    const keyboard = screen.getByRole("img", { name: "Keyboard hint" });
    const rows = keyboard.querySelectorAll(".keyboard-hint__row");
    expect([...rows].map((row) => row.textContent)).toEqual(["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]);
    const highlighted = keyboard.querySelectorAll('[data-highlighted="true"]');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveTextContent("B");
    expect(keyboard.querySelectorAll("button")).toHaveLength(0);
  });

  it("places zero at the right edge of the number row", () => {
    render(<KeyboardHint target="0" contentType="numbers" reducedMotion />);
    const keyboard = screen.getByRole("img", { name: "Keyboard hint" });
    expect(keyboard.querySelector(".keyboard-hint__row")?.textContent).toBe("1234567890");
    expect(keyboard.querySelector('[data-highlighted="true"]')).toHaveTextContent("0");
    expect(keyboard).toHaveClass("keyboard-hint--still");
  });
});
