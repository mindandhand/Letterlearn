import { AnimatePresence, motion } from "framer-motion";
import "./WordCard.css";

interface WordCardProps {
  word?: string;
  emoji?: string;
  visible: boolean;
  showWord: boolean;
  showEmoji: boolean;
  reducedMotion: boolean;
}

export function WordCard({ word, emoji, visible, showWord, showEmoji, reducedMotion }: WordCardProps) {
  const shouldRender = visible && Boolean(word) && (showWord || showEmoji);

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          className="word-card"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.35, ease: "easeOut" }}
        >
          {showEmoji && emoji && (
            <span className="word-card__emoji" aria-hidden="true">
              {emoji}
            </span>
          )}
          {showWord && <span className="word-card__word">{word}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
