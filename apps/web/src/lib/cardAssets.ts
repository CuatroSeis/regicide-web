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

/**
 * Arte de avatar: recorte de la figura real de cada carta del sprite
 * (viewBox acotado al panel de arte interior, sin índices de esquina).
 * Coordenadas medidas sobre svg-cards v4 (ver V6).
 */
export interface AvatarArt {
  spriteId: string;
  viewBox: string;
}

export const AVATAR_ART: Record<AvatarId, AvatarArt> = {
  king: { spriteId: 'spade_king', viewBox: '10.5 10.5 148 223.6' },
  queen: { spriteId: 'heart_queen', viewBox: '10.5 10.5 148 223.6' },
  jack: { spriteId: 'club_jack', viewBox: '10.5 10.5 148 223.6' },
  ace: { spriteId: 'spade_1', viewBox: '63.8 90.8 42.2 48' },
  joker: { spriteId: 'joker_red', viewBox: '10 10 149 224.6' },
};
