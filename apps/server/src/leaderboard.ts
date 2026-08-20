import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Pool, types } from 'pg';
import { CASTLE_ENEMY_COUNT, SOLO_RANK_PRIORITY, soloRankFor } from '@regicide/engine';
import type { SoloRank } from '@regicide/engine';
import type { Card, GameResult, Suit } from '@regicide/engine';

/** Límite de filas guardadas en la tabla de posiciones. */
export const LEADERBOARD_MAX = 50;

/** Entrada de la tabla de posiciones (partida 1p, con usuario autenticado). */
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
  /** ID del usuario autenticado (Supabase auth.users.id). */
  readonly userId: string;
}

/** Payload aceptado por POST /api/scores (el rango lo calcula el servidor). */
export type ScoreInput = Omit<ScoreEntry, 'rank' | 'createdAt'>;

/** Contrato de la tabla de posiciones: soporta memoria+archivo o Postgres. */
export interface LeaderboardStore {
  /** Carga inicial (disco o garantiza el esquema en la BD). */
  load(): Promise<void>;
  /** Registra un resultado; devuelve la entrada completa con rango y fecha. */
  add(input: ScoreInput): ScoreEntry;
  /** Vista ordenada (mejor primero), limitada. */
  list(limit?: number): Promise<readonly ScoreEntry[]>;
}

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
    userId: typeof raw.userId === 'string' && raw.userId.length > 0 ? raw.userId : 'anonymous',
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

function rankFor(input: ScoreInput): SoloRank {
  return soloRankFor(input.result, input.jestersUsed, input.enemiesDefeated);
}

export const DEFAULT_LEADERBOARD_FILE = join(import.meta.dirname, '../../data/leaderboard.json');

/**
 * Tabla de posiciones en memoria con persistencia en un archivo JSON.
 * Validación de payloads, cálculo de rango y ordenamiento viven acá (no en el
 * transporte), para poder testearla de forma aislada.
 */
export class FileLeaderboardStore implements LeaderboardStore {
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
  async list(limit = LEADERBOARD_MAX): Promise<readonly ScoreEntry[]> {
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
        userId: typeof entry.userId === 'string' ? entry.userId : 'anonymous',
      };
    } catch {
      return null;
    }
  }

  private async persist(): Promise<void> {
    if (!this.filePath) return;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(await this.list()), 'utf8');
    } catch {
      // La persistencia es best-effort: el fallo no debe romper la API.
    }
  }
}

/** Clasificación de PostgreSQL para columnas int8 (seed/created_at/id). */
const INT8_OID = 20;

/**
 * Tabla de posiciones persistida en PostgreSQL (Supabase). El rango lo sigue
 * calculando el servidor (no confía en el cliente) y el orden se resuelve en
 * SQL replicando compareEntries. Sin DATABASE_URL se usa FileLeaderboardStore.
 */
export class PostgresLeaderboardStore implements LeaderboardStore {
  private readonly pool: Pool;
  private readonly table: string;
  private pending: Promise<void> = Promise.resolve();

  constructor(connectionString: string, table = 'scores') {
    // Whitelist table name to prevent SQL injection.
    if (!/^[a-z_][a-z0-9_]*$/i.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    this.table = table;
    this.pool = new Pool({ connectionString, max: 3 });
    // int8 llega como string por defecto; seed/createdAt son Number en el dominio.
    types.setTypeParser(INT8_OID, (value: string) => Number(value));
  }

  /** Garantiza el esquema (CREATE TABLE IF NOT EXISTS). */
  async load(): Promise<void> {
    await this.pool.query(`
      create table if not exists ${this.table} (
        id bigint generated always as identity primary key,
        name text not null,
        seed bigint not null,
        result text not null check (result in ('victory','defeat')),
        rank text not null,
        enemies_defeated int not null check (enemies_defeated between 0 and 12),
        enemy_card jsonb,
        jesters_used int not null check (jesters_used between 0 and 2),
        turn_number int not null,
        created_at bigint not null,
        user_id text not null default 'anonymous'
      )
    `);
    // Migración: agregar user_id si falta (tablas viejas).
    await this.pool.query(`
      alter table ${this.table} add column if not exists user_id text not null default 'anonymous'
    `);
  }

  /** Registra un resultado; devuelve la entrada completa con rango y fecha. */
  add(input: ScoreInput): ScoreEntry {
    const entry: ScoreEntry = {
      ...input,
      rank: rankFor(input),
      createdAt: Date.now(),
    };
    this.pending = this.pending
      .then(() => this.insert(entry))
      .catch((err) => {
        console.error('[leaderboard] no se pudo persistir en Postgres:', err);
      });
    return entry;
  }

  /** Espera a que terminen las escrituras pendientes (tests). */
  async flush(): Promise<void> {
    await this.pending;
  }

  /** Vista ordenada (mejor primero), limitada. */
  async list(limit = LEADERBOARD_MAX): Promise<readonly ScoreEntry[]> {
    const safeLimit = Math.max(1, Math.min(limit, LEADERBOARD_MAX));
    const res = await this.pool.query(
      `select name, seed, result, rank, enemies_defeated, enemy_card, jesters_used,
              turn_number, created_at, user_id
       from ${this.table}
       order by
         case rank when 'gold' then 7 when 'silver' then 6 when 'bronze' then 5
           when 'baron' then 4 when 'knight' then 3 when 'squire' then 2 else 1 end desc,
         enemies_defeated desc,
         turn_number asc,
         created_at asc
       limit $1`,
      [safeLimit],
    );
    return res.rows.map((row) => ({
      name: row.name,
      seed: row.seed,
      result: row.result,
      rank: row.rank,
      enemiesDefeated: row.enemies_defeated,
      enemyCard: row.enemy_card,
      jestersUsed: row.jesters_used,
      turnNumber: row.turn_number,
      createdAt: row.created_at,
      userId: row.user_id,
    }));
  }

  /** Cierra el pool (tests / shutdown limpio). */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /** Elimina la tabla (solo para tests de integración). */
  async dropTable(): Promise<void> {
    await this.pool.query(`drop table if exists ${this.table}`);
  }

  private async insert(entry: ScoreEntry): Promise<void> {
    await this.pool.query(
      `insert into ${this.table}
         (name, seed, result, rank, enemies_defeated, enemy_card, jesters_used, turn_number, created_at, user_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.name,
        entry.seed,
        entry.result,
        entry.rank,
        entry.enemiesDefeated,
        entry.enemyCard,
        entry.jestersUsed,
        entry.turnNumber,
        entry.createdAt,
        entry.userId,
      ],
    );
  }
}

/** Factory: Postgres si hay DATABASE_URL; si no, archivo JSON (fallback/dev). */
export function createLeaderboardStore(): LeaderboardStore {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return new PostgresLeaderboardStore(databaseUrl);
  }
  return new FileLeaderboardStore(process.env.LEADERBOARD_FILE ?? DEFAULT_LEADERBOARD_FILE);
}
