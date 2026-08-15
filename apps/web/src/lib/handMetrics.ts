/**
 * Métricas del abanico de cartas para que la mano SIEMPRE quepa en el
 * contenedor disponible (ancho y solape calculados, más chicos con más cartas).
 * Reemplaza los `zoom` fijos del CSS que recortaban la mano en mobile/web.
 */

export const HAND_MAX_CARD_WIDTH = 72;
export const HAND_MIN_CARD_WIDTH = 52;
/** Solape entre cartas contiguas, como fracción del ancho (34/72 ≈ 0.472). */
export const HAND_OVERLAP_RATIO = 0.47;
/** Margen lateral de respiro dentro de .hand-area. */
export const HAND_SIDE_PAD = 12;
/**
 * Margen extra por la rotación del abanico: el bbox de las cartas extremas
 * (giradas ±20°) es más ancho que la propia carta, así que hay que reservar
 * unos píxeles por lado para que la mano nunca desborde.
 */
export const HAND_ROTATION_PAD = 10;

export interface HandMetrics {
  width: number;
  overlap: number;
}

/** Ancho total del abanico: width + (n-1)·(width − overlap). */
export function handFanWidth(width: number, overlap: number, count: number): number {
  return width + (count - 1) * (width - overlap);
}

export function handMetrics(containerWidth: number, count: number): HandMetrics {
  if (count <= 1) return { width: HAND_MAX_CARD_WIDTH, overlap: 0 };
  const avail = Math.max(0, containerWidth - HAND_SIDE_PAD * 2 - HAND_ROTATION_PAD * 2);
  // width·(n − (n−1)·ratio) ≤ avail
  const divisor = count - (count - 1) * HAND_OVERLAP_RATIO;
  const width = Math.max(
    HAND_MIN_CARD_WIDTH,
    Math.min(HAND_MAX_CARD_WIDTH, Math.floor(avail / divisor)),
  );
  const overlap = Math.floor(width * HAND_OVERLAP_RATIO);
  return { width, overlap };
}
