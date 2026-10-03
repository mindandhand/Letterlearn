import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../data/defaultSettings";
import type { GameSettings } from "../../types/game";
import { WelcomePage } from "./WelcomePage";

describe("learning content choice", () => {
  it("offers mixed keys while retaining letter case and excluding Case Match", () => {
    const changes = vi.fn();
    function Home() {
      const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS, mode: "case-match", caseMode: "lowercase" });
      return <WelcomePage settings={settings} onChangeSettings={(patch) => {
        changes(patch);
        setSettings((current) => ({ ...current, ...patch }));
      }} onSelectMode={vi.fn()} onOpenParentSettings={vi.fn()} />;
    }
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Mixed" }));
    expect(changes).toHaveBeenLastCalledWith({ contentType: "mixed", mode: "find-letter" });
    expect(screen.getByText("Find the Key")).toBeInTheDocument();
    expect(screen.queryByText("Case Match")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lowercase abc" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mixed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Press any letter or number and see what happens!")).toBeInTheDocument();
  });
  it("switches to number activities and back without showing Case Match for numbers", () => {
    const changes = vi.fn();
    function Home() {
      const [settings, setSettings] = useState<GameSettings>({ ...DEFAULT_SETTINGS, mode: "case-match" });
      return <WelcomePage settings={settings} onChangeSettings={(patch) => {
        changes(patch);
        setSettings((current) => ({ ...current, ...patch }));
      }} onSelectMode={vi.fn()} onOpenParentSettings={vi.fn()} />;
    }
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "Lowercase abc" }));
    expect(changes).toHaveBeenLastCalledWith({ caseMode: "lowercase" });
    expect(screen.getByRole("button", { name: "Lowercase abc" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Numbers" }));
    expect(changes).toHaveBeenLastCalledWith({ contentType: "numbers", mode: "find-letter" });
    expect(screen.queryByText("Case Match")).not.toBeInTheDocument();
    expect(screen.getByText("Find the Number")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Choose letter case" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Numbers" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Letters" }));
    expect(screen.getByText("Case Match")).toBeInTheDocument();
  });
});
