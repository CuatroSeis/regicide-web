import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'socket.io';
import { FileLeaderboardStore, LEADERBOARD_MAX, parseScoreInput } from '../src/leaderboard.js';
import type { ScoreInput } from '../src/leaderboard.js';
import { startServer } from '../src/index.js';

function input(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    name: '  Ana  ',
    seed: 12345,
    result: 'defeat',
    enemiesDefeated: 7,
    enemyCard: { id: 'enemy-spades-Q', kind: 'enemy', rank: 'Q', suit: 'spades' },
    jestersUsed: 1,
    turnNumber: 20,
    ...overrides,
  };
}

describe('parseScoreInput', () => {
  it('normaliza el nombre (trim + máx 20) y deja el payload', () => {
    const parsed = parseScoreInput(input());
    expect(parsed.name).toBe('Ana');
    expect(parsed.seed).toBe(12345);
    expect(parsed.result).toBe('defeat');
    expect(parsed.enemiesDefeated).toBe(7);
    expect(parsed.jestersUsed).toBe(1);
    expect(parsed.turnNumber).toBe(20);
    expect(parsed.enemyCard).toEqual({ id: 'enemy-spades-Q', kind: 'enemy', rank: 'Q', suit: 'spades' });
  });

  it('payloads inválidos lanzan error', () => {
    expect(() => parseScoreInput(null)).toThrow();
    expect(() => parseScoreInput({ ...input(), result: 'empate' })).toThrow('result');
    expect(() => parseScoreInput({ ...input(), seed: -1 })).toThrow('seed');
    expect(() => parseScoreInput({ ...input(), seed: 1.5 })).toThrow('seed');
    expect(() => parseScoreInput({ ...input(), enemiesDefeated: 13 })).toThrow('enemiesDefeated');
    expect(() => parseScoreInput({ ...input(), jestersUsed: 3 })).toThrow('jestersUsed');
    expect(() => parseScoreInput({ ...input(), turnNumber: 0 })).toThrow('turnNumber');
    expect(() => parseScoreInput({ ...input(), enemyCard: { id: 1 } })).toThrow('enemyCard');
  });

  it('en victoria el enemigo es null', () => {
    const parsed = parseScoreInput(input({ result: 'victory', enemyCard: null }));
    expect(parsed.result).toBe('victory');
    expect(parsed.enemyCard).toBeNull();
  });
});

describe('LeaderboardStore', () => {
  it('calcula el rango y ordena por prioridad de rango', async () => {
    const store = new FileLeaderboardStore();
    const gold = store.add(input({ result: 'victory', jestersUsed: 0, enemiesDefeated: 12, enemyCard: null }));
    const peasant = store.add(input({ enemiesDefeated: 1 }));
    const baron = store.add(input({ enemiesDefeated: 11 }));
    const bronze = store.add(input({ result: 'victory', jestersUsed: 2, enemiesDefeated: 12, enemyCard: null }));

    expect(gold.rank).toBe('gold');
    expect(bronze.rank).toBe('bronze');
    expect(peasant.rank).toBe('peasant');
    expect(baron.rank).toBe('baron');

    expect((await store.list()).map((e) => e.rank)).toEqual(['gold', 'bronze', 'baron', 'peasant']);
  });

  it('desempata por enemigos derrotados y luego por turnos', async () => {
    const store = new FileLeaderboardStore();
    const slow = store.add(input({ enemiesDefeated: 9, turnNumber: 30 }));
    const fast = store.add(input({ enemiesDefeated: 9, turnNumber: 18 }));
    const more = store.add(input({ enemiesDefeated: 10, turnNumber: 40 }));
    expect((await store.list()).map((e) => e.seed)).toEqual([more.seed, fast.seed, slow.seed]);
  });

  it('limita la tabla a LEADERBOARD_MAX entradas', async () => {
    const store = new FileLeaderboardStore();
    for (let i = 0; i < LEADERBOARD_MAX + 10; i++) {
      store.add(input({ name: `J${i}`, seed: i }));
    }
    expect((await store.list()).length).toBe(LEADERBOARD_MAX);
  });

  it('persiste y recarga desde disco', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'regicide-lb-'));
    const file = join(dir, 'leaderboard.json');
    try {
      const store = new FileLeaderboardStore(file);
      await store.load();
      store.add(input({ name: 'Pesistente' }));
      // add() persiste de forma asíncrona (best-effort); esperamos el write.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reloaded = new FileLeaderboardStore(file);
      await reloaded.load();
      const entries = await reloaded.list();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.name).toBe('Pesistente');
      expect(entries[0]!.rank).toBe('knight');

      const onDisk = JSON.parse(await readFile(file, 'utf8')) as Array<{ name: string }>;
      expect(onDisk[0]!.name).toBe('Pesistente');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('API HTTP /api', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'regicide-api-'));
    server = startServer(0, { leaderboard: new FileLeaderboardStore(join(dir, 'lb.json')) });
    await new Promise<void>((resolve) => server.httpServer.once('listening', () => resolve()));
    const port = (server.httpServer.address() as import('node:net').AddressInfo).port;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('POST /api/scores registra y GET /api/leaderboard lo devuelve', async () => {
    const post = await fetch(`${url}/api/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input({ name: 'Rafa', seed: 999 })),
    });
    expect(post.status).toBe(201);
    const posted = (await post.json()) as { entry: { rank: string; name: string } };
    expect(posted.entry.rank).toBe('knight');
    expect(posted.entry.name).toBe('Rafa');

    const get = await fetch(`${url}/api/leaderboard`);
    expect(get.status).toBe(200);
    const body = (await get.json()) as { entries: Array<{ seed: number }> };
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]!.seed).toBe(999);
  });

  it('POST con payload inválido devuelve 400', async () => {
    const res = await fetch(`${url}/api/scores`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'X', result: 'defeat', seed: -5 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/seed/);
  });
});
