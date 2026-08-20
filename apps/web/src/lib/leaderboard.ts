import type { Card, GameResult, SoloRank } from '@regicide/engine';
import { supabase } from './supabase';

/** Entrada de la tabla de posiciones (misma forma que el server). */
export interface LeaderboardEntry {
  readonly name: string;
  readonly seed: number;
  readonly result: GameResult;
  readonly rank: SoloRank;
  readonly enemiesDefeated: number;
  readonly enemyCard: Card | null;
  readonly jestersUsed: number;
  readonly turnNumber: number;
  readonly createdAt: number;
  readonly userId: string;
}

/** Payload a enviar: el server calcula rank/createdAt. */
export type ScoreInput = Omit<LeaderboardEntry, 'rank' | 'createdAt'>;

/** Carga la tabla ordenada desde el servidor (mejores primero). */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { entries: LeaderboardEntry[] };
  return body.entries;
}

/** Registra un resultado de partida 1p en la tabla del servidor. */
export async function submitScore(input: ScoreInput): Promise<LeaderboardEntry> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  const res = await fetch('/api/scores', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { entry: LeaderboardEntry };
  return body.entry;
}
