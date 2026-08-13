import type { Card, FaceRank } from './types.js';
import { NUMERIC_RANKS, SUITS } from './types.js';

export type Rng = () => number;

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 1;

/** Semilla por defecto usada cuando no se provee una (modo solo). */
export const DEFAULT_SEED = 0x5eed;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

function numericCards(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of NUMERIC_RANKS) {
      cards.push({ id: `${suit}-${rank}`, kind: 'number', rank, suit });
    }
  }
  return cards;
}

function aceCards(): Card[] {
  return SUITS.map((suit) => ({ id: `ace-${suit}`, kind: 'ace', rank: 'A', suit }));
}

function jesterCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `jester-${i}`,
    kind: 'jester',
    rank: null,
    suit: null,
  }));
}

function enemyCards(rank: FaceRank): Card[] {
  return SUITS.map((suit) => ({
    id: `enemy-${suit}-${rank}`,
    kind: 'enemy',
    rank,
    suit,
  }));
}

/**
 * [R-1] Castillo: 4 Reyes barajados al fondo, 4 Reinas encima, 4 Jotas arriba.
 * El tope (último elemento) queda siendo una Jota: primer enemigo revelado.
 */
export function createCastleDeck(rng: Rng): Card[] {
  const kings = shuffle(enemyCards('K'), rng);
  const queens = shuffle(enemyCards('Q'), rng);
  const jacks = shuffle(enemyCards('J'), rng);
  return [...kings, ...queens, ...jacks];
}

/**
 * [R-2] Taverna: 2-10 de los cuatro palos + 4 Ases + Jesters según jugadores
 * (1p=0, 2p=0, 3p=1, 4p=2).
 */
export function createTavernDeck(playerCount: number, rng: Rng): Card[] {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new RangeError(`Cantidad de jugadores inválida: ${playerCount}`);
  }
  const jesters = Math.max(0, playerCount - 2);
  const deck = [...numericCards(), ...aceCards(), ...jesterCards(jesters)];
  return shuffle(deck, rng);
}

/** [R-2] Tamaño de mano inicial/máximo según cantidad de jugadores. */
export function maxHandSize(playerCount: number): number {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new RangeError(`Cantidad de jugadores inválida: ${playerCount}`);
  }
  return 9 - playerCount;
}

/** Valor de ataque/discarte de una carta según [R-6], [R-8] y [R-24]. */
export function cardValue(card: Card): number {
  switch (card.kind) {
    case 'number':
      return card.rank as number;
    case 'ace':
      return 1;
    case 'enemy':
      return card.rank === 'J' ? 10 : card.rank === 'Q' ? 15 : 20;
    case 'jester':
      return 0;
  }
}


