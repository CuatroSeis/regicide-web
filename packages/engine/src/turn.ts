import type { Card, GameState, PlayedCard, Player, Suit } from './types.js';
import {
  applySuitPowers,
  computeDamage,
  createEnemy,
  effectiveAttack,
  isDefeated,
  isExactKill,
} from './combat.js';
import { cardValue } from './deck.js';

export interface PlayResult {
  readonly totalValue: number;
  readonly clubsActive: boolean;
  readonly damageDealt: number;
  readonly enemyDefeated: boolean;
  readonly exactKill: boolean;
  readonly victory: boolean;
}

function totalValueOf(cards: readonly Card[]): number {
  return cards.reduce((acc, card) => acc + cardValue(card), 0);
}

function resolveHandCards(player: Player, cardIds: readonly string[]): Card[] {
  if (cardIds.length === 0) {
    throw new Error('Debes seleccionar al menos una carta');
  }
  const byId = new Map(player.hand.map((card) => [card.id, card]));
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error('Carta repetida en la selección');
  }
  const cards: Card[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (!card) throw new Error(`La carta ${id} no está en la mano`);
    cards.push(card);
  }
  return cards;
}

/**
 * [R-7] [R-8] [R-24] Valida un grupo de cartas jugadas:
 * - una sola carta de cualquier valor;
 * - As solo o con otra carta (dos Ases entre sí);
 * - combos de números del mismo valor con suma total ≤ 10
 *   (pares de 2s-5s, triples de 2s-3s, cuádruple de 2s).
 */
function validateGroup(cards: readonly Card[]): void {
  const n = cards.length;
  if (cards.some((card) => card.kind === 'jester')) {
    throw new Error('El Jester no se juega como carta de ataque');
  }
  const hasAce = cards.some((card) => card.kind === 'ace');
  const sameRank = cards.every((card) => card.rank === cards[0]!.rank);
  if (n === 1) return;
  if (n === 2) {
    if (hasAce) return;
    if (sameRank && totalValueOf(cards) <= 10) return;
    throw new Error('Jugada inválida: solo pares del mismo número ≤ 10 o un As con otra carta');
  }
  if (n === 3 || n === 4) {
    if (!hasAce && sameRank && totalValueOf(cards) <= 10) return;
    throw new Error(`Jugada inválida: combos de ${n} solo del mismo número y suma ≤ 10`);
  }
  throw new Error(`Jugada inválida: no se pueden jugar ${n} cartas así`);
}

/** Paso 1 [R-6][R-7][R-8][R-24]: valida la jugada y devuelve las cartas resueltas. */
export function validatePlay(state: GameState, cardIds: readonly string[]): Card[] {
  if (state.gameOver) throw new Error('La partida ya terminó');
  if (state.phase !== 'choose_action') {
    throw new Error('No se pueden jugar cartas en esta fase');
  }
  const cards = resolveHandCards(state.players[state.currentPlayerIndex]!, cardIds);
  validateGroup(cards);
  return cards;
}

/**
 * Steps 1-3 [R-10][R-13][R-17][R-18]: juega cartas, resuelve poderes,
 * inflige daño y procesa la derrota del enemigo si corresponde.
 */
export function playCards(state: GameState, cardIds: readonly string[]): PlayResult {
  const cards = validatePlay(state, cardIds);
  const player = state.players[state.currentPlayerIndex]!;
  const idSet = new Set(cardIds);
  player.hand = player.hand.filter((card) => !idSet.has(card.id));

  const played: PlayedCard[] = cards.map((card) => ({ playerId: player.id, card }));
  state.table.push(...played);

  const totalValue = totalValueOf(cards);
  const suits = [...new Set(cards.map((card) => card.suit).filter((s): s is Suit => s !== null))];
  const { clubsActive } = applySuitPowers(state, suits, totalValue);
  const damageDealt = computeDamage(totalValue, clubsActive);
  state.enemy.damageTaken += damageDealt;
  state.consecutiveYields = 0;

  const enemyDefeated = isDefeated(state.enemy);
  const exactKill = isExactKill(state.enemy);
  let victory = false;

  if (enemyDefeated) {
    // [R-18](i): kill exacto → boca abajo al tope de la Taverna; si no, al descarte.
    if (exactKill) {
      state.tavernDeck.push(state.enemy.card);
    } else {
      state.discardPile.push(state.enemy.card);
    }
    // [R-18](ii): las cartas jugadas contra el enemigo van al descarte.
    state.discardPile.push(...state.table.map((p) => p.card));
    state.table = [];
    // [R-18](iii)(iv): revelar siguiente enemigo, o victoria si el castillo se vació.
    const next = state.castleDeck.pop();
    if (next === undefined) {
      state.gameOver = true;
      state.result = 'victory';
      state.phase = 'game_over';
      victory = true;
    } else {
      state.enemy = createEnemy(next);
      state.phase = 'choose_action';
    }
  } else {
    state.phase = 'suffer_damage';
  }

  state.log.push(
    `Jugador ${player.id} juega ${cards.length} carta(s) (valor ${totalValue}, daño ${damageDealt})`,
  );
  return { totalValue, clubsActive, damageDealt, enemyDefeated, exactKill, victory };
}

/** [R-9] ¿Puede el jugador actual rendirse? En solo siempre (regla ambigua). */
export function canYield(state: GameState): boolean {
  return state.players.length === 1 || state.consecutiveYields < state.players.length - 1;
}

/** [R-9] Rendirse: salta Steps 2-3 y va directo al Step 4 (sufrir daño). */
export function yieldTurn(state: GameState): void {
  if (state.phase !== 'choose_action') {
    throw new Error('No te puedes rendir en esta fase');
  }
  if (!canYield(state)) {
    throw new Error('No puedes rendirte: todos los demás se rindieron en su último turno');
  }
  state.consecutiveYields += 1;
  state.phase = 'suffer_damage';
  state.log.push(`Jugador ${state.players[state.currentPlayerIndex]!.id} se rinde`);
}

/** Cierra el turno: descarta las cartas jugadas y pasa el turno en sentido horario. */
function finishTurn(state: GameState): void {
  state.discardPile.push(...state.table.map((p) => p.card));
  state.table = [];
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.phase = 'choose_action';
  state.turnNumber += 1;
}

/**
 * Step 4 [R-19]: cubrir el ataque efectivo del enemigo descartando cartas
 * de la mano; si no alcanza, el jugador muere y se pierde la partida.
 */
export function discardToSurvive(state: GameState, cardIds: readonly string[]): void {
  if (state.phase !== 'suffer_damage') {
    throw new Error('No hay daño que cubrir en esta fase');
  }
  const player = state.players[state.currentPlayerIndex]!;
  const required = effectiveAttack(state.enemy);
  if (required === 0) {
    finishTurn(state);
    return;
  }
  const cards = resolveHandCards(player, cardIds);
  if (totalValueOf(cards) < required) {
    state.gameOver = true;
    state.result = 'defeat';
    state.phase = 'game_over';
    return;
  }
  const idSet = new Set(cardIds);
  player.hand = player.hand.filter((card) => !idSet.has(card.id));
  state.discardPile.push(...cards);
  finishTurn(state);
}

/**
 * [R-22] Poder del Jester en solitario: descartar la mano y recargarla al máximo,
 * hasta dos veces por partida. No anula la inmunidad del enemigo.
 */
export function jesterSolo(state: GameState): void {
  if (state.players.length !== 1) {
    throw new Error('El poder del Jester en solitario es solo para un jugador');
  }
  if (state.phase !== 'choose_action' && state.phase !== 'suffer_damage') {
    throw new Error('El Jester solo puede usarse al inicio del paso 1 o del paso 4');
  }
  if (state.jestersLeft <= 0) {
    throw new Error('No quedan Jesters disponibles');
  }
  const player = state.players[0]!;
  state.discardPile.push(...player.hand);
  player.hand = [];
  while (player.hand.length < player.maxHandSize && state.tavernDeck.length > 0) {
    player.hand.push(state.tavernDeck.pop()!);
  }
  state.jestersLeft -= 1;
  state.jestersUsed += 1;
  state.log.push('El Jester se activa: mano descartada y recargada');
}

/** [R-23] Nivel de victoria en solitario según Jesters usados. */
export function victoryLevel(state: GameState): 'gold' | 'silver' | 'bronze' {
  return state.jestersUsed === 0 ? 'gold' : state.jestersUsed === 1 ? 'silver' : 'bronze';
}
