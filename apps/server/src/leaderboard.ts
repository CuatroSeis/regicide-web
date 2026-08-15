import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { CASTLE_ENEMY_COUNT, SOLO_RANK_PRIORITY, soloRankFor } from '@regicide/engine';
import type { SoloRank } from '@regicide/engine';
import type { Card, GameResult, Suit } from '@regicide/engine';

/** Límite de filas guardadas en la tabla de posiciones. */
export const LEADERBOARD_MAX = 50;

/** Entrada de la tabla de posiciones (partida 1p, sin cuentas). */
export interface ScoreEntry {
  readonly name: string;
  /** Semilla de la partida: identifica el juego en la tabla. */
  readonly seed: number;
  readonly result: GameResult;
  readonly rank: SoloRank;
  /** Enemigos derrotados (0-12). */
  readonly enemiesDefeated: number;
  /** Enemigo ante el que terminó (null en victoria): "dónde murió". */
  readonly enemyCard: Card | null;
  readonly jestersUsed: number;
  readonly turnNumber: number;
  readonly createdAt: number;
}

/** Payload aceptado por POST /api/scores (el rango lo calcula el servidor). */
export type ScoreInput = Omit<ScoreEntry, 'rank' | 'createdAt'>;

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return 'Jugador';
  const trimmed = name.trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : 'Jugador';
}

function isUint(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function isSuit(value: unknown): value is Suit {
  return value === 'clubs' || value === 'diamonds' || value === 'hearts' || value === 'spades';
}

function isFace(value: unknown): value is 'J' | 'Q' | 'K' {
  return value === 'J' || value === 'Q' || value === 'K';
}

/** Valida y normaliza un payload; lanza Error con motivo legible. */
export function parseScoreInput(input: unknown): ScoreInput {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Payload inválido');
  }
  const raw = input as Record<string, unknown>;
  const result = raw.result;
  if (result !== 'victory' && result !== 'defeat') {
    throw new Error('result inválido');
  }
  const seed = raw.seed;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('seed inválida');
  }
  if (!isUint(raw.enemiesDefeated, CASTLE_ENEMY_COUNT)) {
    throw new Error('enemiesDefeated inválido');
  }
  if (!isUint(raw.jestersUsed, 2)) {
    throw new Error('jestersUsed inválido');
  }
  const turnNumber = raw.turnNumber;
  if (typeof turnNumber !== 'number' || !Number.isInteger(turnNumber) || turnNumber < 1) {
    throw new Error('turnNumber inválido');
  }

  const enemyRaw = raw.enemyCard;
  let enemyCard: Card | null = null;
  if (enemyRaw !== null && enemyRaw !== undefined) {
    if (typeof enemyRaw !== 'object' || enemyRaw === null) {
      throw new Error('enemyCard inválido');
    }
    const e = enemyRaw as Record<string, unknown>;
    if (typeof e.id !== 'string' || !isFace(e.rank) || !isSuit(e.suit)) {
      throw new Error('enemyCard inválido');
    }
    enemyCard = { id: e.id, kind: 'enemy', rank: e.rank, suit: e.suit };
  }

  return {
    name: sanitizeName(raw.name),
    seed,
    result,
    enemiesDefeated: raw.enemiesDefeated,
    enemyCard,
    jestersUsed: raw.jestersUsed,
    turnNumber,
  };
}

/** Ordena la tabla: rango > enemigos > turnos > antigüedad. */
function compareEntries(a: ScoreEntry, b: ScoreEntry): number {
  const byRank = SOLO_RANK_PRIORITY[b.rank] - SOLO_RANK_PRIORITY[a.rank];
  if (byRank !== 0) return byRank;
  if (b.enemiesDefeated !== a.enemiesDefeated) return b.enemiesDefeated - a.enemiesDefeated;
  if (a.turnNumber !== b.turnNumber) return a.turnNumber - b.turnNumber;
  return a.createdAt - b.createdAt;
}

/**
 * Tabla de posiciones en memoria con persistencia en un archivo JSON.
 * Validación de payloads, cálculo de rango y ordenamiento viven acá (no en el
 * transporte), para poder testearla de forma aislada.
 */
export class LeaderboardStore {
  private readonly entries: ScoreEntry[] = [];
  private readonly filePath: string | null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? null;
  }

  /** Carga inicial desde disco (si existe); ignora archivos corruptos. */
  async load(): Promise<void> {
    if (!this.filePath) return;
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf8');
    } catch {
      return;
    }
    try {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        const entry = this.parseEntry(item);
        if (entry) this.insert(entry);
      }
    } catch {
      this.entries.length = 0;
    }
  }

  /** Registra un resultado; devuelve la entrada completa con rango y fecha. */
  add(input: ScoreInput): ScoreEntry {
    const entry: ScoreEntry = {
      ...input,
      rank: rankFor(input),
      createdAt: Date.now(),
    };
    this.insert(entry);
    if (this.filePath) {
      void this.persist();
    }
    return entry;
  }

  /** Vista ordenada (mejor primero), limitada. */
  list(limit = LEADERBOARD_MAX): readonly ScoreEntry[] {
    return [...this.entries]
      .sort(compareEntries)
      .slice(0, Math.max(1, Math.min(limit, LEADERBOARD_MAX)));
  }

  private insert(entry: ScoreEntry): void {
    this.entries.push(entry);
    if (this.entries.length > LEADERBOARD_MAX) {
      this.entries.sort(compareEntries);
      this.entries.length = LEADERBOARD_MAX;
    }
  }

  private parseEntry(value: unknown): ScoreEntry | null {
    if (typeof value !== 'object' || value === null) return null;
    const entry = value as Partial<ScoreEntry>;
    if (!entry.name || !entry.rank) return null;
    try {
      return {
        name: sanitizeName(entry.name),
        seed: entry.seed as number,
        result: entry.result === 'victory' ? 'victory' : 'defeat',
        rank: entry.rank as SoloRank,
        enemiesDefeated: entry.enemiesDefeated ?? 0,
        enemyCard: (entry.enemyCard as Card | null) ?? null,
        jestersUsed: entry.jestersUsed ?? 0,
        turnNumber: entry.turnNumber ?? 1,
        createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
      };
    } catch {
      return null;
    }
  }

  private async persist(): Promise<void> {
    if (!this.filePath) return;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(this.list()), 'utf8');
    } catch {
      // La persistencia es best-effort: el fallo no debe romper la API.
    }
  }
}

function rankFor(input: ScoreInput): SoloRank {
  return soloRankFor(input.result, input.jestersUsed, input.enemiesDefeated);
}

export const DEFAULT_LEADERBOARD_FILE = join(import.meta.dirname, '../../data/leaderboard.json');
