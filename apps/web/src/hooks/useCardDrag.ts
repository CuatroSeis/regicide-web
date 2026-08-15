import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Umbral de arrastre: a partir de este movimiento el gesto se considera drag. */
const DRAG_THRESHOLD = 6;

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
  selectedIds: string[];
  canPlay: boolean;
  toggle: (cardId: string) => void;
  play: () => void;
  tableRef: RefObject<HTMLDivElement | null>;
  enemyRef: RefObject<HTMLDivElement | null>;
}

function isOver(el: Element | null, x: number, y: number): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/**
 * Arrastre para jugar cartas: al arrastrar la selección (o una carta suelta)
 * sobre la mesa o el enemigo se dispara `play()`. La selección por clic y el
 * botón "Jugar" siguen funcionando como fallback.
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
        const { canPlay, play } = optsRef.current;
        if (canPlay && (dragState.overTable || dragState.overEnemy)) {
          play();
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
