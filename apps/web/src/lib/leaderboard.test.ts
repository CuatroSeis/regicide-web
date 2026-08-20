import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLeaderboard, submitScore } from './leaderboard';
import type { ScoreInput } from './leaderboard';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

const ENTRY = {
  name: 'Ana',
  seed: 123,
  result: 'victory',
  rank: 'gold',
  enemiesDefeated: 12,
  enemyCard: null,
  jestersUsed: 0,
  turnNumber: 24,
  createdAt: 1720000000000,
  userId: 'user-123',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchLeaderboard', () => {
  it('trae y devuelve las entradas ordenadas del server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entries: [ENTRY] }),
      }),
    );
    const entries = await fetchLeaderboard(10);
    expect(entries).toEqual([ENTRY]);
    expect(fetch).toHaveBeenCalledWith('/api/leaderboard?limit=10');
  });

  it('lanza error en respuesta no-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchLeaderboard()).rejects.toThrow('HTTP 500');
  });
});

describe('submitScore', () => {
  it('POSTea el payload y devuelve la entrada con rank', async () => {
    const input: ScoreInput = {
      name: 'Ana',
      seed: 123,
      result: 'victory',
      enemiesDefeated: 12,
      enemyCard: null,
      jestersUsed: 0,
      turnNumber: 24,
      userId: 'user-123',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entry: ENTRY }),
      }),
    );
    const entry = await submitScore(input);
    expect(entry.rank).toBe('gold');
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/scores');
    expect(init!.method).toBe('POST');
    expect(JSON.parse(init!.body as string)).toEqual(input);
  });
});
