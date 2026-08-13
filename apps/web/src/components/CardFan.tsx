import { motion } from 'framer-motion';
import type { Card } from '@regicide/engine';
import { CardFace } from './CardFace';

interface CardFanProps {
  cards: Card[];
  /** Ancho de cada carta en píxeles. */
  width?: number;
  /** Ángulo total del abanico en grados (se reparte entre las cartas). */
  totalAngle?: number;
  /** Superposición horizontal entre cartas contiguas (px). */
  overlap?: number;
}

/**
 * Mano de cartas en abanico: las cartas se reparten en arco con rotación
 * progresiva y solape. Reusable también para la mano en partida.
 */
export function CardFan({ cards, width = 92, totalAngle = 40, overlap = 34 }: CardFanProps) {
  if (cards.length === 0) return null;
  const step = cards.length > 1 ? totalAngle / (cards.length - 1) : 0;
  const offset = step * (cards.length - 1) * 0.5;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        minHeight: width * 1.7,
      }}
    >
      {cards.map((card, index) => {
        const rotation = index * step - offset;
        return (
          <motion.div
            key={card.id}
            initial={{ y: -40, opacity: 0, rotate: rotation - 12 }}
            animate={{ y: 0, opacity: 1, rotate: rotation }}
            transition={{ delay: 0.08 * index, type: 'spring', stiffness: 120, damping: 14 }}
            whileHover={{ y: -18, zIndex: 10, scale: 1.06 }}
            style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: index, cursor: 'pointer' }}
          >
            <CardFace card={card} width={width} />
          </motion.div>
        );
      })}
    </div>
  );
}
