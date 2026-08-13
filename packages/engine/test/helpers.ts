import {
  createCastleDeck,
  createRngState,
  createTavernDeck,
  mulberry32,
} from '../src/deck.js';
import { createEnemy } from '../src/combat.js';
import type { GameState, Player } from '../src/types.js';

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return { id, maxHandSize: 8, hand: [], ...overrides };
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  const castle = createCastleDeck(mulberry32(2));
  const first = castle.pop()!;
  const base: GameState = {
    players: [makePlayer('p0')],
    currentPlayerIndex: 0,
    castleDeck: castle,
    tavernDeck: createTavernDeck(1, mulberry32(3)),
    discardPile: [],
    table: [],
    enemy: createEnemy(first),
    rngState: createRngState(1),
    phase: 'choose_action',
    gameOver: false,
    result: null,
    consecutiveYields: 0,
    jestersLeft: 2,
    jestersUsed: 0,
    turnNumber: 1,
    log: [],
  };
  return { ...base, ...overrides };
}
