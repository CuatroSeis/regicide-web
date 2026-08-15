import { describe, expect, it } from 'vitest';
import { createEnemy } from '../src/combat.js';
import { createCastleDeck, createRngState, createTavernDeck, mulberry32 } from '../src/deck.js';
import { playCards } from '../src/turn.js';
import type { GameState } from '../src/types.js';
import { CASTLE_ENEMY_COUNT, gameSummary, soloRank, soloRankFor, SOLO_RANK_PRIORITY } from '../src/summary.js';
import { enemyCard, makePlayer, makeState, numberCard } from './helpers.js';

function defeatedState(overrides: Partial<GameState>): GameState {
  const castle = createCastleDeck(mulberry32(2));
  const first = castle.pop()!;
  return {
    players: [makePlayer('p0')],
    currentPlayerIndex: 0,
    castleDeck: castle,
    tavernDeck: createTavernDeck(1, mulberry32(3)),
    discardPile: [],
    table: [],
    enemy: createEnemy(first),
    rngState: createRngState(1),
    phase: 'game_over',
    gameOver: true,
    result: 'defeat',
    consecutiveYields: 0,
    enemiesDefeated: 0,
    jestersLeft: 0,
    jestersUsed: 0,
    turnNumber: 1,
    lastDamageDealt: 0,
    log: [],
    ...overrides,
  };
}

describe('soloRank [R-23][R-25]', () => {
  it('victoria: Oro con 0 Jesters, Plata con 1, Bronce con 2', () => {
    const base = { ...defeatedState({}), result: 'victory' as const };
    expect(soloRank({ ...base, jestersUsed: 0 })).toBe('gold');
    expect(soloRank({ ...base, jestersUsed: 1 })).toBe('silver');
    expect(soloRank({ ...base, jestersUsed: 2 })).toBe('bronze');
  });

  it('derrota: tiers por progreso del castillo', () => {
    const base = { ...defeatedState({}), result: 'defeat' as const };
    expect(soloRank({ ...base, enemiesDefeated: 0 })).toBe('peasant');
    expect(soloRank({ ...base, enemiesDefeated: 2 })).toBe('peasant');
    expect(soloRank({ ...base, enemiesDefeated: 3 })).toBe('squire');
    expect(soloRank({ ...base, enemiesDefeated: 5 })).toBe('squire');
    expect(soloRank({ ...base, enemiesDefeated: 6 })).toBe('knight');
    expect(soloRank({ ...base, enemiesDefeated: 8 })).toBe('knight');
    expect(soloRank({ ...base, enemiesDefeated: 9 })).toBe('baron');
    expect(soloRank({ ...base, enemiesDefeated: 11 })).toBe('baron');
  });

  it('soloRankFor: mismo resultado que soloRank desde campos crudos (server)', () => {
    expect(soloRankFor('victory', 0, 0)).toBe('gold');
    expect(soloRankFor('victory', 1, 0)).toBe('silver');
    expect(soloRankFor('victory', 2, 12)).toBe('bronze');
    expect(soloRankFor('defeat', 0, 11)).toBe('baron');
    expect(soloRankFor('defeat', 0, 8)).toBe('knight');
    expect(soloRankFor('defeat', 0, 0)).toBe('peasant');
  });

  it('la prioridad ordena victorias sobre derrotas y progreso', () => {
    expect(SOLO_RANK_PRIORITY.gold).toBeGreaterThan(SOLO_RANK_PRIORITY.silver);
    expect(SOLO_RANK_PRIORITY.silver).toBeGreaterThan(SOLO_RANK_PRIORITY.bronze);
    expect(SOLO_RANK_PRIORITY.bronze).toBeGreaterThan(SOLO_RANK_PRIORITY.baron);
    expect(SOLO_RANK_PRIORITY.baron).toBeGreaterThan(SOLO_RANK_PRIORITY.knight);
    expect(SOLO_RANK_PRIORITY.knight).toBeGreaterThan(SOLO_RANK_PRIORITY.squire);
    expect(SOLO_RANK_PRIORITY.squire).toBeGreaterThan(SOLO_RANK_PRIORITY.peasant);
  });
});

describe('gameSummary', () => {
  it('en derrota expone el enemigo actual y el progreso', () => {
    const enemy = createEnemy(enemyCard('spades', 'Q'));
    const state = defeatedState({
      enemy,
      enemiesDefeated: 7,
      jestersUsed: 1,
      turnNumber: 23,
    });
    expect(gameSummary(state)).toEqual({
      result: 'defeat',
      rank: 'knight',
      enemiesDefeated: 7,
      enemyCard: enemy.card,
      jestersUsed: 1,
      turnNumber: 23,
    });
  });

  it('en victoria no hay enemigo final y el rango es del nivel de Jesters', () => {
    const state = defeatedState({
      result: 'victory',
      enemiesDefeated: CASTLE_ENEMY_COUNT,
      jestersUsed: 0,
    });
    const summary = gameSummary(state);
    expect(summary.result).toBe('victory');
    expect(summary.rank).toBe('gold');
    expect(summary.enemyCard).toBeNull();
    expect(summary.enemiesDefeated).toBe(CASTLE_ENEMY_COUNT);
  });

  it('playCards incrementa enemiesDefeated al derrotar al enemigo', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.damageTaken = 15;
    const state = makeState({
      enemy,
      castleDeck: [enemyCard('hearts', 'J')],
      jestersLeft: 2,
      players: [makePlayer('p0', { hand: [enemyCard('hearts', 'K')] })],
    });
    expect(state.enemiesDefeated).toBe(0);
    const result = playCards(state, [enemyCard('hearts', 'K').id]);
    expect(result.enemyDefeated).toBe(true);
    expect(state.enemiesDefeated).toBe(1);
  });
});

it('makeState base inicia enemiesDefeated en 0', () => {
  expect(makeState({}).enemiesDefeated).toBe(0);
});

it('los helpers de cartas numéricas siguen siendo válidos para jugadas', () => {
  expect(numberCard('hearts', 4).id).toBe('hearts-4');
});
