import type { Card } from '@regicide/engine';
import { BACK_SPRITE_ID, CARD_HEIGHT, CARD_WIDTH, SPRITE_PATH, cardSpriteId } from '../lib/cardAssets';

interface CardFaceProps {
  card: Card;
  /** Ancho en píxeles; la altura se deriva del aspecto de la carta. */
  width?: number;
  /** Muestra el dorso en lugar del frente. */
  facedown?: boolean;
}

/**
 * Renderiza una carta usando el sprite compartido `svg-cards.svg` (LGPL-2.1,
 * htdebeer/SVG-cards). El <use> apunta a la referencia absoluta del sprite.
 */
export function CardFace({ card, width = 70, facedown = false }: CardFaceProps) {
  const height = (width / CARD_WIDTH) * CARD_HEIGHT;
  const href = `${SPRITE_PATH}#${facedown ? BACK_SPRITE_ID : cardSpriteId(card)}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      role="img"
      aria-label={facedown ? 'Carta boca abajo' : `${card.rank} de ${card.suit}`}
    >
      <use href={href} />
    </svg>
  );
}
