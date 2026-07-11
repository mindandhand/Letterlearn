export interface LetterData {
  uppercase: string;
  lowercase: string;
  word: string;
  emoji: string;
  /** Filename-safe slug matching public/audio/{accent}/word-{audioSlug}.m4a */
  audioSlug: string;
  sentence?: string;
}

export const LETTERS: LetterData[] = [
  { uppercase: "A", lowercase: "a", word: "Apple", emoji: "🍎", audioSlug: "apple", sentence: "A is for Apple." },
  { uppercase: "B", lowercase: "b", word: "Ball", emoji: "⚽", audioSlug: "ball", sentence: "B is for Ball." },
  { uppercase: "C", lowercase: "c", word: "Cat", emoji: "🐱", audioSlug: "cat", sentence: "C is for Cat." },
  { uppercase: "D", lowercase: "d", word: "Dog", emoji: "🐶", audioSlug: "dog", sentence: "D is for Dog." },
  { uppercase: "E", lowercase: "e", word: "Egg", emoji: "🥚", audioSlug: "egg", sentence: "E is for Egg." },
  { uppercase: "F", lowercase: "f", word: "Fish", emoji: "🐟", audioSlug: "fish", sentence: "F is for Fish." },
  { uppercase: "G", lowercase: "g", word: "Grapes", emoji: "🍇", audioSlug: "grapes", sentence: "G is for Grapes." },
  { uppercase: "H", lowercase: "h", word: "Hat", emoji: "🎩", audioSlug: "hat", sentence: "H is for Hat." },
  {
    uppercase: "I",
    lowercase: "i",
    word: "Ice cream",
    emoji: "🍦",
    audioSlug: "ice-cream",
    sentence: "I is for Ice cream.",
  },
  { uppercase: "J", lowercase: "j", word: "Juice", emoji: "🧃", audioSlug: "juice", sentence: "J is for Juice." },
  { uppercase: "K", lowercase: "k", word: "Kite", emoji: "🪁", audioSlug: "kite", sentence: "K is for Kite." },
  { uppercase: "L", lowercase: "l", word: "Lion", emoji: "🦁", audioSlug: "lion", sentence: "L is for Lion." },
  { uppercase: "M", lowercase: "m", word: "Moon", emoji: "🌙", audioSlug: "moon", sentence: "M is for Moon." },
  { uppercase: "N", lowercase: "n", word: "Nest", emoji: "🪺", audioSlug: "nest", sentence: "N is for Nest." },
  { uppercase: "O", lowercase: "o", word: "Orange", emoji: "🍊", audioSlug: "orange", sentence: "O is for Orange." },
  { uppercase: "P", lowercase: "p", word: "Pig", emoji: "🐷", audioSlug: "pig", sentence: "P is for Pig." },
  { uppercase: "Q", lowercase: "q", word: "Queen", emoji: "👑", audioSlug: "queen", sentence: "Q is for Queen." },
  { uppercase: "R", lowercase: "r", word: "Rabbit", emoji: "🐰", audioSlug: "rabbit", sentence: "R is for Rabbit." },
  { uppercase: "S", lowercase: "s", word: "Sun", emoji: "☀️", audioSlug: "sun", sentence: "S is for Sun." },
  { uppercase: "T", lowercase: "t", word: "Tree", emoji: "🌳", audioSlug: "tree", sentence: "T is for Tree." },
  {
    uppercase: "U",
    lowercase: "u",
    word: "Umbrella",
    emoji: "☂️",
    audioSlug: "umbrella",
    sentence: "U is for Umbrella.",
  },
  { uppercase: "V", lowercase: "v", word: "Violin", emoji: "🎻", audioSlug: "violin", sentence: "V is for Violin." },
  { uppercase: "W", lowercase: "w", word: "Whale", emoji: "🐋", audioSlug: "whale", sentence: "W is for Whale." },
  {
    uppercase: "X",
    lowercase: "x",
    word: "Xylophone",
    emoji: "🎹",
    audioSlug: "xylophone",
    sentence: "X is for Xylophone.",
  },
  { uppercase: "Y", lowercase: "y", word: "Yo-yo", emoji: "🪀", audioSlug: "yo-yo", sentence: "Y is for Yo-yo." },
  { uppercase: "Z", lowercase: "z", word: "Zebra", emoji: "🦓", audioSlug: "zebra", sentence: "Z is for Zebra." },
];

export const LETTER_MAP: Record<string, LetterData> = Object.fromEntries(
  LETTERS.map((letter) => [letter.uppercase, letter]),
);

export function getLetterData(letter: string): LetterData | undefined {
  return LETTER_MAP[letter.toUpperCase()];
}

export const ALL_LETTER_KEYS = LETTERS.map((letter) => letter.uppercase);
export const FIRST_LETTER_KEYS = ALL_LETTER_KEYS.slice(0, 3);
