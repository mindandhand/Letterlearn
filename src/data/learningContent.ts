import type { GameSettings, LearningContentType } from "../types/game";
import { ALL_LETTER_KEYS, getLetterData } from "./letters";
import { ALL_NUMBER_KEYS, getNumberData } from "./numbers";

export function getItemContentType(key: string): "letters" | "numbers" {
  return /^[0-9]$/.test(key) ? "numbers" : "letters";
}

export function getLearningData(key: string, contentType: LearningContentType) {
  const itemType = contentType === "mixed" ? getItemContentType(key) : contentType;
  return itemType === "numbers" ? getNumberData(key) : getLetterData(key);
}

function validRange(configured: string[], allowed: string[]): string[] {
  const valid = Array.isArray(configured) ? [...new Set(configured.filter((key) => allowed.includes(key)))] : [];
  return valid.length ? valid : allowed;
}

export function getEnabledKeys(settings: GameSettings): string[] {
  if (settings.contentType === "numbers") return validRange(settings.enabledNumbers, ALL_NUMBER_KEYS);
  const letters = validRange(settings.enabledLetters, ALL_LETTER_KEYS);
  if (settings.contentType === "letters") return letters;
  const numbers = validRange(settings.enabledNumbers, ALL_NUMBER_KEYS);
  const mixed: string[] = [];
  for (let index = 0; index < Math.max(letters.length, numbers.length); index += 1) {
    if (index < letters.length) mixed.push(letters[index]);
    if (index < numbers.length) mixed.push(numbers[index]);
  }
  return mixed;
}
