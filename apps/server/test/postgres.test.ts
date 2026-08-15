import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresLeaderboardStore } from '../src/leaderboard.js';
import type { ScoreInput } from '../src/leaderboard.js';

const DATABASE_URL = process.env.DATABASE_URL;

function input(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    name: 'Ana',
    seed: 12345,
    result: 'defeat',
    enemiesDefeated: 7,
    enemyCard: { id: 'enemy-spades-Q', kind: 'enemy', rank: 'Q', suit: 'spades' },
    jestersUsed: 1,
    turnNumber: 20,
    ...overrides,
  };
}

// Integración contra Supabase real: requiere DATABASE_URL (se salta en CI).
describe.skipIf(!DATABASE_URL)('PostgresLeaderboardStore (integración)', () => {
  const table = `scores_it_${Date.now()}`;
  let store: PostgresLeaderboardStore;

  beforeAll(async () => {
    store = new PostgresLeaderboardStore(DATABASE_URL!, table);
    await store.load();
  });

  afterAll(async () => {
    try {
      await store.dropTable();
    } finally {
      await store.close();
    }
  });

  it('inserta, ordena por rango y persiste entre instancias', async () => {
    const gold = store.add(
      input({ result: 'victory', jestersUsed: 0, enemiesDefeated: 12, enemyCard: null }),
    );
    store.add(input({ enemiesDefeated: 1 }));
    store.add(input({ enemiesDefeated: 11 }));
    expect(gold.rank).toBe('gold');
    await store.flush();

    expect((await store.list()).map((e) => e.rank)).toEqual(['gold', 'baron', 'peasant']);

    const reloaded = new PostgresLeaderboardStore(DATABASE_URL!, table);
    try {
      await reloaded.load();
      expect((await reloaded.list()).map((e) => e.rank)).toEqual(['gold', 'baron', 'peasant']);
    } finally {
      await reloaded.close();
    }
  });

  it('respeta el límite de la vista', async () => {
    const res = await store.list(2);
    expect(res).toHaveLength(2);
  });
});
