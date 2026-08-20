import type { Card, Suit } from '@regicide/engine';
import type { AvatarId } from '../components/AvatarCard';

/** Ruta absoluta del sprite de cartas (htdebeer/SVG-cards, LGPL-2.1). */
export const SPRITE_PATH = '/cards/svg-cards.svg';

/** Dimensiones naturales de una carta en el sprite (ver README de SVG-cards). */
export const CARD_WIDTH = 169.075;
export const CARD_HEIGHT = 244.64;

const SUIT_ID: Record<Suit, string> = {
  clubs: 'club',
  diamonds: 'diamond',
  hearts: 'heart',
  spades: 'spade',
};

const FACE_ID: Record<string, string> = {
  J: 'jack',
  Q: 'queen',
  K: 'king',
};

/**
 * Único punto de mapeo Card → id dentro del sprite.
 * Ases usan `*_1` (el sprite no usa `*_ace`); el Jester usa el joker rojo.
 */
export function cardSpriteId(card: Card): string {
  if (card.kind === 'jester') return 'joker_red';
  const suit = SUIT_ID[card.suit!];
  if (card.kind === 'ace') return `${suit}_1`;
  if (card.kind === 'enemy' || (card.rank !== null && FACE_ID[card.rank] !== undefined)) {
    return `${suit}_${FACE_ID[card.rank!]!}`;
  }
  return `${suit}_${card.rank}`;
}

/** Dorso del mazo. */
export const BACK_SPRITE_ID = 'back';

/** Avatar IDs disponibles para el perfil. */
export const AVATAR_IDS: readonly AvatarId[] = ['jack', 'queen', 'king', 'joker', 'ace'] as const;
