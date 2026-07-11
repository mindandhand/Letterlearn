import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CelebrationAnimationId } from "../../data/encouragements";
import "./CelebrationLayer.css";

interface CelebrationLayerProps {
  animation: CelebrationAnimationId | null;
  themeCelebrationIcon: string;
  streak: number;
  reducedMotion: boolean;
}

const CONFETTI_EMOJI = ["🌸", "🌺", "🌻", "🌷", "👏", "✨"];
const PIECE_COUNT = 8;

interface Piece {
  id: number;
  x: number;
  delay: number;
  rotate: number;
  emoji: string;
}

export function CelebrationLayer({
  animation,
  themeCelebrationIcon,
  streak,
  reducedMotion,
}: CelebrationLayerProps) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        delay: Math.random() * 0.2,
        rotate: (Math.random() - 0.5) * 180,
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animation],
  );

  if (!animation) {
    return null;
  }

  const showStreak = streak >= 3;

  return (
    <div className="celebration-layer" aria-hidden="true">
      <AnimatePresence>
        {animation === "confetti" &&
          pieces.map((piece) => (
            <motion.span
              key={piece.id}
              className="celebration-layer__piece"
              initial={{ opacity: 1, y: -20, x: piece.x, rotate: 0 }}
              animate={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: [1, 1, 0], y: 260, rotate: piece.rotate }
              }
              transition={{ duration: reducedMotion ? 0.3 : 1.4, delay: piece.delay }}
            >
              {piece.emoji}
            </motion.span>
          ))}

        {animation === "stars" &&
          pieces.map((piece) => (
            <motion.span
              key={piece.id}
              className="celebration-layer__piece"
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: [1, 1, 0], scale: 1, x: piece.x, y: piece.x / 2 }
              }
              transition={{ duration: reducedMotion ? 0.3 : 1, delay: piece.delay }}
            >
              ⭐
            </motion.span>
          ))}

        {animation === "rainbow" && (
          <motion.div
            className="celebration-layer__rainbow"
            initial={{ opacity: 0, scale: 0.6, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.6 }}
          >
            🌈
          </motion.div>
        )}

        {animation === "balloons" &&
          pieces.slice(0, 5).map((piece) => (
            <motion.span
              key={piece.id}
              className="celebration-layer__piece"
              initial={{ opacity: 1, y: 120, x: piece.x }}
              animate={reducedMotion ? { opacity: 0 } : { opacity: [1, 1, 0], y: -220 }}
              transition={{ duration: reducedMotion ? 0.3 : 1.6, delay: piece.delay }}
            >
              🎈
            </motion.span>
          ))}

        {animation === "dancing-animal" && (
          <motion.div
            className="celebration-layer__mascot"
            initial={{ scale: 0.6, rotate: -10 }}
            animate={
              reducedMotion
                ? { scale: 1, rotate: 0 }
                : { scale: [0.6, 1.2, 1], rotate: [-10, 10, -6, 6, 0] }
            }
            transition={{ duration: reducedMotion ? 0.2 : 0.9 }}
          >
            {themeCelebrationIcon}
          </motion.div>
        )}

        {animation === "sticker" && (
          <motion.div
            className="celebration-layer__sticker"
            initial={{ opacity: 0, scale: 0, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.5, type: "spring" }}
          >
            🏅
          </motion.div>
        )}
      </AnimatePresence>

      {showStreak && (
        <motion.div
          className="celebration-layer__streak"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {streak} in a row!
        </motion.div>
      )}
    </div>
  );
}
