import type { Card, Enemy, GameResult, GameState, Phase, PlayedCard } from './types.js';

/** Longitud del código de sala generado por el servidor. */
export const ROOM_CODE_LENGTH = 5;

/** Mínimo de jugadores para poder iniciar la partida en una sala. */
export const MIN_PLAYERS_TO_START = 2;

/**
 * Vista pública de la partida: no expone las manos, ni las cartas del mazo
 * del castillo [R-1] ni las de la Taverna (boca abajo). El descarte y la mesa
 * sí son públicos (boca arriba [R-3]), igual que el enemigo actual.
 */
export interface PublicGameState {
  readonly players: readonly { readonly id: string; readonly maxHandSize: number; readonly handCount: number }[];
  readonly currentPlayerIndex: number;
  readonly castleCount: number;
  readonly tavernCount: number;
  readonly discardPile: readonly Card[];
  readonly table: readonly PlayedCard[];
  readonly enemy: Enemy;
  readonly phase: Phase;
  readonly gameOver: boolean;
  readonly result: GameResult | null;
  readonly consecutiveYields: number;
  readonly enemiesDefeated: number;
  readonly jestersLeft: number;
  readonly jestersUsed: number;
  readonly turnNumber: number;
  readonly lastDamageDealt: number;
  readonly log: readonly string[];
}

/** Vista de un jugador: vista pública + su propia mano. */
export interface PlayerGameState extends PublicGameState {
  readonly playerId: string;
  readonly hand: readonly Card[];
  readonly isMyTurn: boolean;
}

/** Vista pública: info de cada jugador (sin cartas) y estado del tablero. */
export function publicSnapshot(state: GameState): PublicGameState {
  return {
    players: state.players.map((p) => ({
      id: p.id,
      maxHandSize: p.maxHandSize,
      handCount: p.hand.length,
    })),
    currentPlayerIndex: state.currentPlayerIndex,
    castleCount: state.castleDeck.length,
    tavernCount: state.tavernDeck.length,
    discardPile: [...state.discardPile],
    table: [...state.table],
    enemy: structuredClone(state.enemy),
    phase: state.phase,
    gameOver: state.gameOver,
    result: state.result,
    consecutiveYields: state.consecutiveYields,
    enemiesDefeated: state.enemiesDefeated,
    jestersLeft: state.jestersLeft,
    jestersUsed: state.jestersUsed,
    turnNumber: state.turnNumber,
    lastDamageDealt: state.lastDamageDealt,
    log: [...state.log],
  };
}

/** Vista de un jugador concreto: vista pública + su mano. [Info oculta por jugador] */
export function playerSnapshot(state: GameState, playerId: string): PlayerGameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Jugador desconocido: ${playerId}`);
  return {
    ...publicSnapshot(state),
    playerId,
    hand: [...player.hand],
    isMyTurn: state.players[state.currentPlayerIndex]!.id === playerId,
  };
}

// ---------------------------------------------------------------------------
// Contrato socket.io (modo online). Los tipos viven aquí (lugar compartido
// entre server y web) y los payloads se validan con las funciones puras del
// engine, nunca con lógica duplicada.
// ---------------------------------------------------------------------------

export interface RoomPlayerInfo {
  readonly id: string;
  readonly name: string;
  readonly connected: boolean;
}

export interface RoomInfo {
  readonly code: string;
  readonly players: readonly RoomPlayerInfo[];
  readonly started: boolean;
  readonly hostId: string;
  readonly maxPlayers: number;
}

export type Ack<T> = (result: T) => void;

export type RoomAck =
  | { ok: true; code: string; playerId: string; playerName: string; room: RoomInfo }
  | { ok: false; error: string };

export type GameAck = { ok: true } | { ok: false; error: string };

export interface ServerToClientEvents {
  /** Estado sincronizado (público + mano propia). Se reenvía entero al reconectar. */
  'game:state-sync': (state: PlayerGameState) => void;
  /** La sala cambió (jugador unido/salió/desconectado). */
  'room:updated': (room: RoomInfo) => void;
  /** Un jugador quedó fuera de la sala (la partida no iniciada se cierra). */
  'room:closed': (reason: string) => void;
}

export interface ClientToServerEvents {
  'room:create': (payload: { name: string }, ack: Ack<RoomAck>) => void;
  'room:join': (payload: { code: string; name: string }, ack: Ack<RoomAck>) => void;
  /** Reconexión de un jugador desconectado (p. ej. tras recargar la pestaña). */
  'room:rejoin': (payload: { code: string; playerId: string }, ack: Ack<RoomAck>) => void;
  'room:leave': (ack?: Ack<{ ok: boolean; error?: string }>) => void;
  'game:start': (ack?: Ack<GameAck>) => void;
  'game:play': (payload: { cardIds: string[] }, ack?: Ack<GameAck>) => void;
  'game:yield': (ack?: Ack<GameAck>) => void;
  'game:discard': (payload: { cardIds: string[] }, ack?: Ack<GameAck>) => void;
  /** [R-20] Jugar el Jester y elegir quién va después. */
  'game:play-jester': (payload: { nextPlayerId: string }, ack?: Ack<GameAck>) => void;
}
