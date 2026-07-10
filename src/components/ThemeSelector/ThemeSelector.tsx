import { THEMES } from "../../data/themes";
import type { ThemeId } from "../../types/game";
import "./ThemeSelector.css";

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onSelect: (theme: ThemeId) => void;
}

export function ThemeSelector({ currentTheme, onSelect }: ThemeSelectorProps) {
  return (
    <div className="theme-selector" role="radiogroup" aria-label="Choose a visual theme">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          role="radio"
          aria-checked={currentTheme === theme.id}
          className={`theme-selector__card ${currentTheme === theme.id ? "theme-selector__card--active" : ""}`}
          data-theme={theme.id}
          onClick={() => onSelect(theme.id)}
        >
          <span className="theme-selector__icon" aria-hidden="true">
            {theme.icon}
          </span>
          <span className="theme-selector__name">{theme.name}</span>
        </button>
      ))}
    </div>
  );
}
