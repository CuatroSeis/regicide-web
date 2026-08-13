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
  /** IDs de cartas seleccionadas (modo selección). */
  selectedIds?: string[];
  /** Callback al hacer clic en una carta (modo selección). */
  onSelect?: (cardId: string) => void;
}

/**
 * Mano de cartas en abanico: las cartas se reparten en arco con rotación
 * progresiva y solape. Reusable para el menú y para la mano en partida.
 */
export function CardFan({
  cards,
  width = 92,
  totalAngle = 40,
  overlap = 34,
  selectedIds = [],
  onSelect,
}: CardFanProps) {
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
        const isSelected = selectedIds.includes(card.id);
        return (
          <motion.div
            key={card.id}
            initial={{ y: -40, opacity: 0, rotate: rotation - 12 }}
            animate={{
              y: isSelected ? -20 : 0,
              opacity: 1,
              rotate: rotation,
              boxShadow: isSelected
                ? '0 0 0 3px var(--gold), 0 10px 24px rgba(0,0,0,0.45)'
                : '0 2px 8px rgba(0,0,0,0.35)',
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            whileHover={onSelect ? { scale: 1.07, zIndex: 20 } : { y: -18, scale: 1.06, zIndex: 10 }}
            onClick={onSelect ? () => onSelect(card.id) : undefined}
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: isSelected ? 15 : index,
              cursor: onSelect ? 'pointer' : 'default',
              borderRadius: 8,
            }}
          >
            <CardFace card={card} width={width} />
          </motion.div>
        );
      })}
    </div>
  );
}
