import type { Card, GameResult, GameState } from './types.js';

/** Rango final de una partida en solitario (estable para tabla de posiciones). */
export type SoloRank =
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'baron'
  | 'knight'
  | 'squire'
  | 'peasant';

/**
 * Orden de prioridad del rango para ordenar la tabla: victorias Oro > Plata >
 * Bronce; en derrota, Barón (llegó al Rey) > Caballero > Escudero > Peón.
 */
export const SOLO_RANK_PRIORITY: Record<SoloRank, number> = {
  gold: 7,
  silver: 6,
  bronze: 5,
  baron: 4,
  knight: 3,
  squire: 2,
  peasant: 1,
};

/** Enemigos del castillo: 4 Jotas, 4 Reinas, 4 Reyes. */
export const CASTLE_ENEMY_COUNT = 12;

/** [R-23][R-25] Rango según resultado, Jesters usados y progreso del castillo. */
export function soloRankFor(
  result: GameResult,
  jestersUsed: number,
  enemiesDefeated: number,
): SoloRank {
  if (result === 'victory') {
    return jestersUsed === 0 ? 'gold' : jestersUsed === 1 ? 'silver' : 'bronze';
  }
  if (enemiesDefeated <= 2) return 'peasant';
  if (enemiesDefeated <= 5) return 'squire';
  if (enemiesDefeated <= 8) return 'knight';
  return 'baron';
}

/** Rango final de una partida en solitario (estable para tabla de posiciones). */
export function soloRank(state: SummarySource): SoloRank {
  return soloRankFor(state.result ?? 'defeat', state.jestersUsed, state.enemiesDefeated);
}

export interface GameSummary {
  readonly result: GameResult | null;
  readonly rank: SoloRank;
  /** Enemigos del castillo derrotados (12 en victoria). */
  readonly enemiesDefeated: number;
  /** Enemigo ante el que terminó la partida (null en victoria). */
  readonly enemyCard: Card | null;
  readonly jestersUsed: number;
  readonly turnNumber: number;
}

/** Campos del estado que usa el resumen (válidos tanto para GameState como PublicGameState). */
export type SummarySource = Pick<GameState, 'result' | 'jestersUsed' | 'enemiesDefeated' | 'turnNumber' | 'enemy'>;

/** Resumen del final de partida para la tabla de posiciones (solo 1p). */
export function gameSummary(state: SummarySource): GameSummary {
  return {
    result: state.result,
    rank: soloRankFor(state.result ?? 'defeat', state.jestersUsed, state.enemiesDefeated),
    enemiesDefeated: state.enemiesDefeated,
    enemyCard: state.result === 'victory' ? null : state.enemy.card,
    jestersUsed: state.jestersUsed,
    turnNumber: state.turnNumber,
  };
}
