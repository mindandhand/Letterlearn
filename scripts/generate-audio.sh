#!/bin/bash
# Developer fallback for generating placeholder spoken-word clips (letters,
# words, prompts, pairing phrases) with the local macOS `say` command.
# For production, replace the generated files in public/audio/{us,gb}/ with
# real human recordings using the same filenames.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/audio"
TMP_AIFF="$(mktemp -t letterlearn-audio).aiff"
trap 'rm -f "$TMP_AIFF"' EXIT

LETTERS=(A B C D E F G H I J K L M N O P Q R S T U V W X Y Z)
WORDS=(Apple Ball Cat Dog Egg Fish Grapes Hat "Ice cream" Juice Kite Lion Moon Nest Orange Pig Queen Rabbit Sun Tree Umbrella Violin Whale Xylophone Yo-yo Zebra)
PHONICS=("A says ah." "B says buh." "C says kuh." "D says duh." "E says eh." "F says fff." "G says guh." "H says huh." "I says ih." "J says juh." "K says kuh." "L says lll." "M says mmm." "N says nnn." "O says aw." "P says puh." "Q says kwuh." "R says rrr." "S says sss." "T says tuh." "U says uh." "V says vvv." "W says wuh." "X says ks." "Y says yuh." "Z says zzz.")

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
    phonics="${PHONICS[$i]}"
    lower="$(echo "$letter" | tr '[:upper:]' '[:lower:]')"
    slug="$(echo "$word" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"

    # macOS `say` reads an isolated bare uppercase letter as "Capital X"
    # (e.g. `say "E"` and `say "Capital E"` render identically), but reads
    # an isolated lowercase letter as just the letter name. Use lowercase
    # here so the single-letter clip says "E", not "Capital E".
    gen "$voice" "$lower" "$dir/letter-$letter.m4a"
    gen "$voice" "$phonics" "$dir/sound-$letter.m4a"
    gen "$voice" "$word" "$dir/word-$slug.m4a"
    gen "$voice" "Press $letter." "$dir/prompt-$letter.m4a"
    gen "$voice" "Big $letter, small $lower." "$dir/pair-$letter.m4a"
    gen "$voice" "Yes. $phonics $letter is for $word." "$dir/correct-$letter.m4a"
    gen "$voice" "Try again. Find $letter." "$dir/hint-$letter.m4a"
    echo "  $letter -> $word ($slug)"
  done

  gen "$voice" "Hello! This is how I sound." "$dir/test-sound.m4a"
done

echo "Done. Files written to $OUT_DIR"
