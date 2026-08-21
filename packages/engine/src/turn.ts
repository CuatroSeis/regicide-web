import type { Card, GameState, PlayedCard, Player, Suit } from './types.js';
import { GameError } from './errors.js';
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

/**
 * ¿Puede el jugador actual sobrevivir el ataque del enemigo?
 * Solo un jugador puede recargar con el Jester [R-22]; en multijugador
 * los Jesters son cartas de la mano (valor 0) y no ayudan a cubrir.
 */
function canSurviveAttack(state: GameState): boolean {
  const required = effectiveAttack(state.enemy);
  if (required === 0) return true;
  const player = state.players[state.currentPlayerIndex]!;
  return (
    totalValueOf(player.hand) >= required ||
    (state.players.length === 1 && state.jestersLeft > 0)
  );
}

/**
 * [R-19][R-25] Si el jugador en el paso 4 no puede cubrir el ataque (y no
 * puede recargar con el Jester), muere y se pierde la partida. Evita que la
 * partida quede bloqueada con el botón de cubrir deshabilitado.
 */
function checkCoverOrDie(state: GameState): void {
  if (state.phase !== 'suffer_damage' || state.gameOver) return;
  if (canSurviveAttack(state)) return;
  state.gameOver = true;
  state.result = 'defeat';
  state.phase = 'game_over';
  state.log.push({ key: 'cover_fail_defeat' });
}

function resolveHandCards(player: Player, cardIds: readonly string[]): Card[] {
  if (cardIds.length === 0) {
    throw new GameError('empty_selection', 'Debes seleccionar al menos una carta');
  }
  const byId = new Map(player.hand.map((card) => [card.id, card]));
  if (new Set(cardIds).size !== cardIds.length) {
    throw new GameError('duplicate_card', 'Carta repetida en la selección');
  }
  const cards: Card[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (!card) throw new GameError('card_not_in_hand', `La carta ${id} no está en la mano`);
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
    throw new GameError('jester_not_attack', 'El Jester no se juega como carta de ataque');
  }
  const hasAce = cards.some((card) => card.kind === 'ace');
  const sameRank = cards.every((card) => card.rank === cards[0]!.rank);
  if (n === 1) return;
  if (n === 2) {
    if (hasAce) return;
    if (sameRank && totalValueOf(cards) <= 10) return;
    throw new GameError('invalid_play', 'Jugada inválida: solo pares del mismo número ≤ 10 o un As con otra carta');
  }
  if (n === 3 || n === 4) {
    if (!hasAce && sameRank && totalValueOf(cards) <= 10) return;
    throw new GameError('invalid_play', `Jugada inválida: combos de ${n} solo del mismo número y suma ≤ 10`);
  }
  throw new GameError('invalid_play', `Jugada inválida: no se pueden jugar ${n} cartas así`);
}

/** Paso 1 [R-6][R-7][R-8][R-24]: valida la jugada y devuelve las cartas resueltas. */
export function validatePlay(state: GameState, cardIds: readonly string[]): Card[] {
  if (state.gameOver) throw new GameError('game_over', 'La partida ya terminó');
  if (state.phase !== 'choose_action') {
    throw new GameError('wrong_phase_play', 'No se pueden jugar cartas en esta fase');
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
  state.lastDamageDealt = damageDealt;
  state.consecutiveYields = 0;

  const enemyDefeated = isDefeated(state.enemy);
  const exactKill = isExactKill(state.enemy);
  let victory = false;

  if (enemyDefeated) {
    state.enemiesDefeated += 1;
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
      // [R-18](iv) el derrotador empieza un turno nuevo; si quedó sin mano y
      // sin Jester, la partida termina en derrota automática [R-25].
      checkStuck(state);
    }
  } else {
    state.phase = 'suffer_damage';
    checkCoverOrDie(state);
  }

  state.log.push({
    key: 'play_cards',
    args: { player: player.id, count: cards.length, value: totalValue, damage: damageDealt },
  });
  return { totalValue, clubsActive, damageDealt, enemyDefeated, exactKill, victory };
}

/** [R-9] ¿Puede el jugador actual rendirse? En solo siempre (regla ambigua). */
export function canYield(state: GameState): boolean {
  return state.players.length === 1 || state.consecutiveYields < state.players.length - 1;
}

/** [R-9] Rendirse: salta Steps 2-3 y va directo al Step 4 (sufrir daño). */
export function yieldTurn(state: GameState): void {
  if (state.phase !== 'choose_action') {
    throw new GameError('wrong_phase_yield', 'No te puedes rendir en esta fase');
  }
  if (!canYield(state)) {
    throw new GameError('yield_blocked_all', 'No puedes rendirte: todos los demás se rindieron en su último turno');
  }
  state.consecutiveYields += 1;
  state.lastDamageDealt = 0;
  state.phase = 'suffer_damage';
  checkCoverOrDie(state);
  state.log.push({ key: 'yield', args: { player: state.players[state.currentPlayerIndex]!.id } });
}

/**
 * Cierra el turno tras el paso 4: pasa el turno en sentido horario y empieza
 * la fase de jugar. Las cartas jugadas quedan en la mesa hasta que el enemigo
 * sea derrotado [R-18](ii); el nuevo jugador empieza en el paso 1 [R-19].
 */
function finishTurn(state: GameState): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.phase = 'choose_action';
  state.turnNumber += 1;
  state.lastDamageDealt = 0;
  checkStuck(state);
}

/**
 * [R-25] El jugador actual pierde la partida si no puede continuar: mano
 * vacía (no puede jugar ni cubrir), sin Jester que lo rescate (solo: sin
 * refill [R-22]; multiplayer: sin carta de Jester en mano, trivial con mano
 * vacía) y ataque efectivo > 0 (si es 0, rendirse es seguro, R-19). Se
 * declara de forma automática, sin exigir un clic en "Rendirse" previo.
 */
export function isStuck(state: GameState): boolean {
  const player = state.players[state.currentPlayerIndex]!;
  if (player.hand.length > 0) return false;
  if (state.players.length === 1 && state.jestersLeft > 0) return false;
  return effectiveAttack(state.enemy) > 0;
}

function checkStuck(state: GameState): void {
  if (isStuck(state)) {
    state.gameOver = true;
    state.result = 'defeat';
    state.phase = 'game_over';
    state.log.push({ key: 'stuck_defeat' });
  }
}

/**
 * Step 4 [R-19]: cubrir el ataque efectivo del enemigo descartando cartas
 * de la mano; si no alcanza, el jugador muere y se pierde la partida.
 */
export function discardToSurvive(state: GameState, cardIds: readonly string[]): void {
  if (state.phase !== 'suffer_damage') {
    throw new GameError('wrong_phase_cover', 'No hay daño que cubrir en esta fase');
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
    throw new GameError('jester_solo_single_only', 'El poder del Jester en solitario es solo para un jugador');
  }
  if (state.phase !== 'choose_action' && state.phase !== 'suffer_damage') {
    throw new GameError('jester_wrong_phase', 'El Jester solo puede usarse al inicio del paso 1 o del paso 4');
  }
  if (state.jestersLeft <= 0) {
    throw new GameError('no_jesters_left', 'No quedan Jesters disponibles');
  }
  const player = state.players[0]!;
  state.discardPile.push(...player.hand);
  player.hand = [];
  while (player.hand.length < player.maxHandSize && state.tavernDeck.length > 0) {
    player.hand.push(state.tavernDeck.pop()!);
  }
  state.jestersLeft -= 1;
  state.jestersUsed += 1;
  state.log.push({ key: 'jester_solo' });
  checkCoverOrDie(state);
  checkStuck(state);
}

/** [R-23] Nivel de victoria en solitario según Jesters usados. */
export function victoryLevel(state: GameState): 'gold' | 'silver' | 'bronze' {
  return state.jestersUsed === 0 ? 'gold' : state.jestersUsed === 1 ? 'silver' : 'bronze';
}

/**
 * [R-20] [R-21] Jugar el Jester (multijugador): una sola carta en el paso 1,
 * ataque 0, niega la inmunidad del enemigo, salta pasos 3 y 4 y elige quién
 * empieza el siguiente turno. El Jester queda en la mesa hasta que el enemigo
 * sea derrotado [R-18](ii).
 */
export function playJester(state: GameState, nextPlayerIndex: number): void {
  if (state.gameOver) throw new GameError('game_over', 'La partida ya terminó');
  if (state.phase !== 'choose_action') {
    throw new GameError('jester_wrong_phase', 'No se puede jugar el Jester en esta fase');
  }
  if (state.players.length === 1) {
    throw new GameError('jester_multi_only', 'El Jester como jugada solo aplica en multijugador');
  }
  const player = state.players[state.currentPlayerIndex]!;
  const jester = player.hand.find((card) => card.kind === 'jester');
  if (!jester) throw new GameError('no_jester_in_hand', 'No tienes un Jester en la mano');
  if (nextPlayerIndex < 0 || nextPlayerIndex >= state.players.length) {
    throw new GameError('invalid_target', 'Jugador destino inválido');
  }
  // TODO(regla-ambigua): "the player of the Jester chooses any player to go next"
  // — se asume que no puede elegirse a sí mismo para evitar turnos consecutivos.
  if (nextPlayerIndex === state.currentPlayerIndex) {
    throw new GameError('jester_self_target', 'El Jester debe elegir a otro jugador para ir después');
  }

  player.hand = player.hand.filter((card) => card.id !== jester.id);
  state.table.push({ playerId: player.id, card: jester });

  // [R-21]: contra un enemigo de ♠, las picas jugadas antes del Jester
  // comienzan a reducir el ataque (escudo retroactivo). Si la inmunidad ya
  // estaba anulada, el escudo ya las contó, así que no se suman dos veces.
  if (state.enemy.card.suit === 'spades' && !state.enemy.immunityNegated) {
    const priorSpades = state.table
      .filter((p) => p.card.id !== jester.id && p.card.suit === 'spades')
      .reduce((acc, p) => acc + cardValue(p.card), 0);
    state.enemy.spadeShield += priorSpades;
  }

  state.enemy.immunityNegated = true;
  state.consecutiveYields = 0;
  state.lastDamageDealt = 0;
  state.currentPlayerIndex = nextPlayerIndex;
  state.phase = 'choose_action';
  state.turnNumber += 1;
  state.log.push({
    key: 'jester_multi',
    args: { player: player.id, target: state.players[nextPlayerIndex]!.id },
  });
  checkStuck(state);
}
