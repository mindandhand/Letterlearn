import { AnimatePresence, motion } from "framer-motion";
import "./WordCard.css";

interface WordCardProps {
  word?: string;
  emoji?: string;
  quantity?: number;
  visible: boolean;
  showWord: boolean;
  showEmoji: boolean;
  reducedMotion: boolean;
  onReplay: () => void;
  disabled?: boolean;
}

export function WordCard({ word, emoji, visible, showWord, showEmoji, reducedMotion, onReplay, disabled, quantity }: WordCardProps) {
  const shouldRender = visible && Boolean(word) && (showWord || showEmoji);

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.button
          type="button"
          className="word-card"
          aria-label={`Listen to ${word}`}
          onClick={onReplay}
          disabled={disabled}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: "easeOut" }}
        >
          {showEmoji && quantity !== undefined && (
            <span className="word-card__quantity" role="img" aria-label={`${quantity} dots`}>
              {Array.from({ length: quantity }, (_, index) => <span className="word-card__dot" aria-hidden="true" key={index} />)}
            </span>
          )}
          {showEmoji && quantity === undefined && emoji && (
            <span className="word-card__emoji" aria-hidden="true">
              {emoji}
            </span>
          )}
          {showWord && <span className="word-card__word">{word}</span>}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
