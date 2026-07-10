export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

export function pickRandomExcept<T>(items: T[], exclude: T): T {
  if (items.length <= 1) {
    return items[0];
  }
  const candidates = items.filter((item) => item !== exclude);
  if (candidates.length === 0) {
    return items[0];
  }
  return pickRandom(candidates);
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
