import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Umbral de arrastre: a partir de este movimiento el gesto se considera drag. */
const DRAG_THRESHOLD = 6;

export type CardDragMode = 'attack' | 'defend';

export interface CardDragState {
  /** IDs de las cartas arrastradas (la selección, o la carta tocada). */
  ids: string[];
  x: number;
  y: number;
  overTable: boolean;
  overEnemy: boolean;
}

interface UseCardDragOptions {
  enabled: boolean;
  /**
   * attack: soltar sobre mesa/enemigo juega (paso 1).
   * defend: soltar en cualquier lado descarta la selección para cubrir daño
   *         (paso 4), solo si `canDiscard`.
   */
  mode?: CardDragMode;
  selectedIds: string[];
  canPlay: boolean;
  canDiscard?: boolean;
  toggle: (cardId: string) => void;
  play: () => void;
  discard?: () => void;
  tableRef: RefObject<HTMLDivElement | null>;
  enemyRef: RefObject<HTMLDivElement | null>;
}

function isOver(el: Element | null, x: number, y: number): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * Arrastre de cartas según fase: al atacar, soltar la selección sobre la mesa
 * o el enemigo dispara `play()`; al defender (paso 4), soltarlas en cualquier
 * lugar dispara `discard()` si la selección cubre el daño. La selección por
 * clic y los botones siguen funcionando como fallback.
 */
export function useCardDrag(options: UseCardDragOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const pendingRef = useRef<{ pointerId: number; cardId: string; x: number; y: number } | null>(null);
  const dragRef = useRef<CardDragState | null>(null);
  const [drag, setDrag] = useState<CardDragState | null>(null);

  const onCardPointerDown = useCallback((cardId: string, e: React.PointerEvent) => {
    if (!optsRef.current.enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pendingRef.current) return;
    pendingRef.current = { pointerId: e.pointerId, cardId, x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending) return;
      if (dragRef.current) {
        const { tableRef, enemyRef } = optsRef.current;
        const next: CardDragState = {
          ...dragRef.current,
          x: e.clientX,
          y: e.clientY,
          overTable: isOver(tableRef.current, e.clientX, e.clientY),
          overEnemy: isOver(enemyRef.current, e.clientX, e.clientY),
        };
        dragRef.current = next;
        setDrag(next);
        return;
      }
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) <= DRAG_THRESHOLD) return;
      const { selectedIds, toggle } = optsRef.current;
      const ids = selectedIds.includes(pending.cardId)
        ? [...selectedIds]
        : [...selectedIds, pending.cardId];
      if (!selectedIds.includes(pending.cardId)) toggle(pending.cardId);
      const next: CardDragState = { ids, x: e.clientX, y: e.clientY, overTable: false, overEnemy: false };
      dragRef.current = next;
      setDrag(next);
    };

    const onUp = () => {
      const dragState = dragRef.current;
      if (dragState) {
        const opts = optsRef.current;
        if (opts.mode === 'defend') {
          // Soltar las cartas en cualquier lado = tirarlas para cubrir daño.
          if (opts.canDiscard && opts.discard) opts.discard();
        } else if (opts.canPlay && (dragState.overTable || dragState.overEnemy)) {
          opts.play();
        }
      }
      pendingRef.current = null;
      dragRef.current = null;
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return { drag, onCardPointerDown };
}
