import type { ThemeId } from "../types/game";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  decorations: string[];
  celebrationIcon: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "rainbow",
    name: "Rainbow Land",
    description: "Bright clouds, rainbows and stars",
    icon: "🌈",
    decorations: ["☁️", "🌈", "⭐", "☁️", "⭐"],
    celebrationIcon: "🌈",
  },
  {
    id: "space",
    name: "Space Adventure",
    description: "Rockets and planets among the stars",
    icon: "🚀",
    decorations: ["🪐", "⭐", "🚀", "🌙", "⭐"],
    celebrationIcon: "🚀",
  },
  {
    id: "forest",
    name: "Animal Forest",
    description: "Friendly bears, rabbits and foxes",
    icon: "🦊",
    decorations: ["🌳", "🐻", "🐰", "🦊", "🌿"],
    celebrationIcon: "🦊",
  },
  {
    id: "ocean",
    name: "Ocean World",
    description: "Fish, whales and bubbles underwater",
    icon: "🐳",
    decorations: ["🐠", "🐳", "🫧", "🐟", "🫧"],
    celebrationIcon: "🐳",
  },
];

export const THEME_MAP: Record<ThemeId, ThemeConfig> = Object.fromEntries(
  THEMES.map((theme) => [theme.id, theme]),
) as Record<ThemeId, ThemeConfig>;
