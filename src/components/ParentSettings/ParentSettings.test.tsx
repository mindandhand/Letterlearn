import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../data/defaultSettings";
import type { GameSettings } from "../../types/game";
import { ParentSettings } from "./ParentSettings";

describe("number settings", () => {
  it("keeps mixed letter and number ranges independent and shows both progress sets", () => {
    const changes = vi.fn();
    function Settings() {
      const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS, mode: "case-match", enabledLetters: ["B"], enabledNumbers: ["0"] });
      return <ParentSettings isOpen settings={settings} progress={{}} onChange={(patch) => {
        changes(patch);
        setSettings((current) => ({ ...current, ...patch }));
      }} onResetProgress={vi.fn()} onClose={vi.fn()} onTestSound={vi.fn()} />;
    }
    const { container } = render(<Settings />);
    const gate = screen.getByRole("dialog", { name: "Parent verification" });
    const factors = within(gate).getByText(/What is/).textContent!.match(/\d+/g)!.map(Number);
    fireEvent.click(within(gate).getByRole("button", { name: String(factors[0] * factors[1]) }));
    fireEvent.click(within(screen.getByRole("group", { name: "Choose learning content" })).getByRole("button", { name: "Mixed" }));
    expect(changes).toHaveBeenLastCalledWith({ contentType: "mixed", mode: "find-letter" });
    expect(screen.getByRole("region", { name: "Letter range" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Number range" })).toBeInTheDocument();
    expect(screen.getByText("Letter case")).toBeInTheDocument();
    expect(screen.queryByText("Case Match")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Letter & number names")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "0" })).toBeChecked();
    changes.mockClear();
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "0" }));
    expect(changes).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "6–9" }));
    expect(changes).toHaveBeenLastCalledWith({ enabledNumbers: ["6", "7", "8", "9"] });
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "A-F" }));
    expect(changes).toHaveBeenLastCalledWith({ enabledLetters: ["A", "B", "C", "D", "E", "F"] });
    expect(screen.getByRole("checkbox", { name: "6" })).toBeChecked();
    expect(container.querySelectorAll(".progress-stars-grid__cell")).toHaveLength(36);
  });
  it("offers number ranges, preserves at least one number and leaves letters unchanged", () => {
    const changes = vi.fn();
    function Settings() {
      const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS, contentType: "numbers" });
      return <ParentSettings isOpen settings={settings} progress={{}} onChange={(patch) => {
        changes(patch);
        setSettings((current) => ({ ...current, ...patch }));
      }} onResetProgress={vi.fn()} onClose={vi.fn()} onTestSound={vi.fn()} />;
    }
    render(<Settings />);
    const gate = screen.getByRole("dialog", { name: "Parent verification" });
    const factors = within(gate).getByText(/What is/).textContent!.match(/\d+/g)!.map(Number);
    fireEvent.click(within(gate).getByRole("button", { name: String(factors[0] * factors[1]) }));
    expect(screen.queryByText("Letter case")).not.toBeInTheDocument();
    expect(screen.queryByText("Case Match")).not.toBeInTheDocument();
    expect(screen.queryByText("Word names")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Number names")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "0–5" }));
    expect(changes).toHaveBeenLastCalledWith({ enabledNumbers: ["0", "1", "2", "3", "4", "5"] });
    for (const number of ["1", "2", "3", "4", "5"]) fireEvent.click(screen.getByRole("checkbox", { name: number }));
    changes.mockClear();
    fireEvent.click(screen.getByRole("checkbox", { name: "0" }));
    expect(changes).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "0" })).toBeChecked();
  });
});
