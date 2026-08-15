import type { Card, Suit } from '@regicide/engine';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { BACK_SPRITE_ID, CARD_HEIGHT, CARD_WIDTH, SPRITE_PATH, cardSpriteId } from '../lib/cardAssets';

interface CardFaceProps {
  card: Card;
  /** Ancho en píxeles; la altura se deriva del aspecto de la carta. */
  width?: number;
  /** Muestra el dorso en lugar del frente. */
  facedown?: boolean;
}

const SUIT_NAME_KEY: Record<Suit, TranslationKey> = {
  hearts: 'suitHearts',
  diamonds: 'suitDiamonds',
  clubs: 'suitClubs',
  spades: 'suitSpades',
};

const RANK_KEY: Record<'J' | 'Q' | 'K', TranslationKey> = { J: 'rankJ', Q: 'rankQ', K: 'rankK' };

/**
 * Renderiza una carta usando el sprite compartido `svg-cards.svg` (LGPL-2.1,
 * htdebeer/SVG-cards). El <use> apunta a la referencia absoluta del sprite.
 */
export function CardFace({ card, width = 70, facedown = false }: CardFaceProps) {
  const { t } = useLanguage();
  const height = (width / CARD_WIDTH) * CARD_HEIGHT;
  const href = `${SPRITE_PATH}#${facedown ? BACK_SPRITE_ID : cardSpriteId(card)}`;
  const rank =
    card.kind === 'jester'
      ? 'Jester'
      : card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
        ? t(RANK_KEY[card.rank])
        : String(card.rank);
  const label = facedown
    ? t('cardBack')
    : t('cardOf', { rank, suit: t(SUIT_NAME_KEY[card.suit!]) });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <use href={href} />
    </svg>
  );
}
