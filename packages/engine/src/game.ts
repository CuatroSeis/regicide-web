import type { Card, GameResult, GameState, Player } from './types.js';
import {
  DEFAULT_SEED,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createCastleDeck,
  createRngState,
  createTavernDeck,
  maxHandSize,
  mulberry32,
} from './deck.js';
import { createEnemy } from './combat.js';
import {
  discardToSurvive,
  jesterSolo,
  playCards,
  playJester as playJesterAction,
  victoryLevel,
  yieldTurn,
} from './turn.js';
import type { PlayResult } from './turn.js';

export interface CreateGameOptions {
  /** 1 (solo) a 4 jugadores. Por defecto 1. */
  playerCount?: number;
  /** Semilla del RNG para construcción de mazos y barajados en juego. */
  seed?: number;
  /** IDs de jugador en orden de turno; debe coincidir con playerCount. */
  playerIds?: string[];
}

/** Crea una partida nueva: mazos [R-1][R-2], manos iniciales [R-2] y primer enemigo [R-1]. */
export function createGame(options: CreateGameOptions = {}): GameState {
  const playerCount = options.playerCount ?? 1;
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new RangeError(`Cantidad de jugadores inválida: ${playerCount}`);
  }
  const seed = options.seed ?? DEFAULT_SEED;
  const rng = mulberry32(seed);
  const castleDeck = createCastleDeck(rng);
  const tavernDeck = createTavernDeck(playerCount, rng);
  const first = castleDeck.pop();
  if (!first) throw new Error('El castillo quedó vacío');

  const ids = options.playerIds ?? Array.from({ length: playerCount }, (_, i) => `p${i + 1}`);
  if (ids.length !== playerCount) {
    throw new RangeError('playerIds debe tener tantos elementos como playerCount');
  }
  const handSize = maxHandSize(playerCount);
  const players: Player[] = ids.map((id) => {
    const hand: Card[] = [];
    for (let i = 0; i < handSize && tavernDeck.length > 0; i++) {
      hand.push(tavernDeck.pop()!);
    }
    return { id, maxHandSize: handSize, hand };
  });

  return {
    players,
    currentPlayerIndex: 0,
    castleDeck,
    tavernDeck,
    discardPile: [],
    table: [],
    enemy: createEnemy(first),
    rngState: createRngState((seed ^ 0x9e3779b9) >>> 0),
    phase: 'choose_action',
    gameOver: false,
    result: null,
    consecutiveYields: 0,
    enemiesDefeated: 0,
    jestersLeft: playerCount === 1 ? 2 : 0,
    jestersUsed: 0,
    turnNumber: 1,
    lastDamageDealt: 0,
    log: [{ key: 'game_start', args: { count: playerCount } }],
  };
}

/**
 * Fachada de juego que mantiene el estado interno y aplica cada acción sobre
 * una copia (`structuredClone`), de modo que el estado anterior nunca muta.
 */
export class Game {
  private state: GameState;

  constructor(options: CreateGameOptions = {}) {
    this.state = createGame(options);
  }

  /** Copia del estado actual, segura de mutar por el llamador. */
  get snapshot(): GameState {
    return structuredClone(this.state);
  }

  /** Paso 1-3: juega cartas contra el enemigo actual. */
  play(cardIds: readonly string[]): PlayResult {
    const next = structuredClone(this.state);
    const result = playCards(next, cardIds);
    this.state = next;
    return result;
  }

  /** Paso 1: rendirse (salta los pasos 2-3). */
  yield(): void {
    const next = structuredClone(this.state);
    yieldTurn(next);
    this.state = next;
  }

  /** Paso 4: descartar cartas para cubrir el ataque del enemigo. */
  discard(cardIds: readonly string[]): void {
    const next = structuredClone(this.state);
    discardToSurvive(next, cardIds);
    this.state = next;
  }

  /** [R-22] Poder del Jester en solitario. */
  jester(): void {
    const next = structuredClone(this.state);
    jesterSolo(next);
    this.state = next;
  }

  /** [R-20] Jugar el Jester (multijugador) y elegir quién va después. */
  playJester(nextPlayerIndex: number): void {
    const next = structuredClone(this.state);
    playJesterAction(next, nextPlayerIndex);
    this.state = next;
  }

  get over(): boolean {
    return this.state.gameOver;
  }

  get result(): GameResult | null {
    return this.state.result;
  }

  /** [R-23] Nivel de victoria en solitario; null si no hubo victoria. */
  get victoryLevel(): 'gold' | 'silver' | 'bronze' | null {
    return this.state.result === 'victory' ? victoryLevel(this.state) : null;
  }
}
