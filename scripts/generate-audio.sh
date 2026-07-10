#!/bin/bash
# Pre-generates spoken-word audio clips (letters, words, prompts, pairing
# phrases) using the local macOS `say` command and converts them to AAC/M4A.
# Run once; output is committed to public/audio/ as static assets so the app
# never depends on the browser's live SpeechSynthesis API for core content.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/audio"
TMP_AIFF="$(mktemp -t letterlearn-audio).aiff"
trap 'rm -f "$TMP_AIFF"' EXIT

LETTERS=(A B C D E F G H I J K L M N O P Q R S T U V W X Y Z)
WORDS=(Apple Ball Cat Dog Egg Fish Grapes Hat "Ice cream" Juice Kite Lion Moon Nest Orange Pig Queen Rabbit Sun Tree Umbrella Violin Whale Xylophone Yo-yo Zebra)

ACCENTS=(us gb)
VOICES=(Samantha Daniel)

gen() {
  local voice="$1" text="$2" outfile="$3"
  say -v "$voice" -o "$TMP_AIFF" "$text"
  afconvert -f m4af -d aac "$TMP_AIFF" "$outfile"
}

for a in "${!ACCENTS[@]}"; do
  accent="${ACCENTS[$a]}"
  voice="${VOICES[$a]}"
  dir="$OUT_DIR/$accent"
  mkdir -p "$dir"
  echo "== Generating $accent ($voice) =="

  for i in "${!LETTERS[@]}"; do
    letter="${LETTERS[$i]}"
    word="${WORDS[$i]}"
    lower="$(echo "$letter" | tr '[:upper:]' '[:lower:]')"
    slug="$(echo "$word" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"

    # macOS `say` reads an isolated bare uppercase letter as "Capital X"
    # (e.g. `say "E"` and `say "Capital E"` render identically), but reads
    # an isolated lowercase letter as just the letter name. Use lowercase
    # here so the single-letter clip says "E", not "Capital E".
    gen "$voice" "$lower" "$dir/letter-$letter.m4a"
    gen "$voice" "$word" "$dir/word-$slug.m4a"
    gen "$voice" "Press $letter." "$dir/prompt-$letter.m4a"
    gen "$voice" "Uppercase $letter, lowercase $lower." "$dir/pair-$letter.m4a"
    echo "  $letter -> $word ($slug)"
  done

  gen "$voice" "Hello! This is how I sound." "$dir/test-sound.m4a"
done

echo "Done. Files written to $OUT_DIR"
