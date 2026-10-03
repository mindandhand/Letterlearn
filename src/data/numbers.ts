export interface NumberData {
  key: string;
  word: string;
  emoji: string;
  audioSlug: string;
}

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

export const NUMBERS: NumberData[] = NUMBER_WORDS.map((word, value) => ({
  key: String(value),
  word,
  emoji: "",
  audioSlug: `number-${value}`,
}));

export const ALL_NUMBER_KEYS = NUMBERS.map(({ key }) => key);

export function getNumberData(key: string): NumberData | undefined {
  return NUMBERS.find((number) => number.key === key);
}
