import { motion } from 'framer-motion';
import type { Ref } from 'react';
import type { Card } from '@regicide/engine';
import { CardFace } from './CardFace';

interface CardPileProps {
  mode: 'deck' | 'discard';
  count: number;
  /** Carta superior visible (boca arriba) para el cementerio. */
  topCard?: Card;
  label: string;
  /** Ancla para las animaciones de viaje de cartas. */
  ref?: Ref<HTMLDivElement>;
}

const PILE_WIDTH = 85;
const PILE_DEPTH = 2;
const FACE_DOWN: Card = { id: '__dorso__', kind: 'number', rank: 2, suit: 'clubs' };

/** Pila de cartas (mazo boca abajo o cementerio boca arriba) con contador. */
export function CardPile({ mode, count, topCard, label, ref }: CardPileProps) {
  const isDiscard = mode === 'discard';
  const isEmpty = count <= 0;
  const baseDepth = isEmpty ? 0 : Math.min(PILE_DEPTH, count);
  const topKey = isDiscard ? (topCard?.id ?? 'empty') : `deck-${count}`;

  return (
    <div className={`card-pile card-pile--${mode}${isEmpty ? ' card-pile--empty' : ''}`} ref={ref}>
      <div className="card-pile-label">{label}</div>
      <div className="card-pile-stack">
        {Array.from({ length: baseDepth }).map((_, depth) => (
          <CardFace key={depth} card={FACE_DOWN} width={PILE_WIDTH} facedown />
        ))}
        {isDiscard ? (
          topCard && (
            <motion.div
              key={topKey}
              className="card-pile-top"
              initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <CardFace card={topCard} width={PILE_WIDTH} />
            </motion.div>
          )
        ) : (
          <motion.div
            key={topKey}
            className="card-pile-top"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 0.25 }}
          >
            <CardFace card={FACE_DOWN} width={PILE_WIDTH} facedown />
          </motion.div>
        )}
      </div>
      <div className="card-pile-count">{count}</div>
    </div>
  );
}
