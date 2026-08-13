import type { Card, Enemy, GameState, Suit } from './types.js';
import { cardValue, shuffleFromState } from './deck.js';

/** [R-5] Ataque y vida de cada enemigo. */
export const ENEMY_STATS: Record<'J' | 'Q' | 'K', { attack: number; health: number }> = {
  J: { attack: 10, health: 20 },
  Q: { attack: 15, health: 30 },
  K: { attack: 20, health: 40 },
};

const ENEMY_RANKS = ['J', 'Q', 'K'] as const;

export function createEnemy(card: Card): Enemy {
  if (card.kind !== 'enemy' || !ENEMY_RANKS.includes(card.rank as (typeof ENEMY_RANKS)[number])) {
    throw new Error(`Carta no válida como enemigo: ${card.id}`);
  }
  const stats = ENEMY_STATS[card.rank as 'J' | 'Q' | 'K'];
  return {
    card,
    attack: stats.attack,
    maxHealth: stats.health,
    damageTaken: 0,
    spadeShield: 0,
    immunityNegated: false,
  };
}

/** [R-14] Ataque del enemigo reducido por picas acumuladas (nunca negativo). */
export function effectiveAttack(enemy: Enemy): number {
  return Math.max(0, enemy.attack - enemy.spadeShield);
}

/** [R-17] ¿El enemigo fue derrotado? */
export function isDefeated(enemy: Enemy): boolean {
  return enemy.damageTaken >= enemy.maxHealth;
}

/** [R-18] ¿El daño fue exactamente igual a la vida (kill exacto)? */
export function isExactKill(enemy: Enemy): boolean {
  return enemy.damageTaken === enemy.maxHealth;
}

/** [R-13] Daño infligido: el doble si el poder de tréboles está activo. */
export function computeDamage(totalValue: number, clubsActive: boolean): number {
  return clubsActive ? totalValue * 2 : totalValue;
}

/** [R-15] El enemigo es inmune al poder del palo que coincide con el suyo, salvo Jester. */
export function isPowerBlocked(enemy: Enemy, suit: Suit): boolean {
  return suit === enemy.card.suit && !enemy.immunityNegated;
}

/**
 * [R-11] ♥ Recuperar del descarte: barajar, contar hasta `amount` cartas boca abajo
 * y colocarlas DEBAJO de la Taverna; el resto vuelve al descarte boca arriba.
 * Si el descarte tiene menos cartas que el valor, se recuperan todas las disponibles.
 */
export function healFromDiscard(state: GameState, amount: number): void {
  if (state.discardPile.length === 0) return;
  const shuffled = shuffleFromState(state.discardPile, state.rngState);
  const count = Math.min(amount, shuffled.length);
  const healed = shuffled.slice(0, count);
  state.tavernDeck.unshift(...healed);
  state.discardPile = shuffled.slice(count);
}

/**
 * [R-12] ♦ Robar: el jugador actual primero, luego en sentido horario, de a una carta,
 * hasta completar `amount`. Se saltea a quienes tienen la mano llena y nunca se roba
 * por encima del máximo. No hay penalidad por mazo de robo vacío.
 */
export function drawForDiamonds(state: GameState, amount: number): void {
  const players = state.players;
  const n = players.length;
  let remaining = amount;
  while (remaining > 0 && state.tavernDeck.length > 0) {
    let drew = false;
    for (let k = 0; k < n && remaining > 0; k++) {
      if (state.tavernDeck.length === 0) break;
      const player = players[(state.currentPlayerIndex + k) % n]!;
      if (player.hand.length >= player.maxHandSize) continue;
      player.hand.push(state.tavernDeck.pop()!);
      remaining--;
      drew = true;
    }
    if (!drew) break;
  }
}

/** Orden fijo de resolución para garantizar [R-16]: ♥ antes que ♦. */
const RESOLUTION_ORDER: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

/**
 * [R-10] [R-13] [R-14] [R-15] [R-16] Resuelve los poderes de los palos jugados.
 * Los poderes bloqueados por inmunidad del enemigo no se activan; el número sí suma al daño.
 */
export function applySuitPowers(
  state: GameState,
  suits: readonly Suit[],
  totalValue: number,
): { clubsActive: boolean } {
  let clubsActive = false;
  for (const suit of RESOLUTION_ORDER) {
    if (!suits.includes(suit)) continue;
    if (isPowerBlocked(state.enemy, suit)) continue;
    switch (suit) {
      case 'hearts':
        healFromDiscard(state, totalValue);
        break;
      case 'diamonds':
        drawForDiamonds(state, totalValue);
        break;
      case 'clubs':
        clubsActive = true;
        break;
      case 'spades':
        state.enemy.spadeShield += totalValue;
        break;
    }
  }
  return { clubsActive };
}

/** [R-19] ¿La suma de los valores de las cartas elegidas cubre el ataque efectivo? */
export function canCoverDamage(enemy: Enemy, cards: readonly Card[]): boolean {
  const total = cards.reduce((acc, card) => acc + cardValue(card), 0);
  return total >= effectiveAttack(enemy);
}
