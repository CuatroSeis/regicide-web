import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCardDrag } from './useCardDrag';

type PointerEvt = Parameters<ReturnType<typeof useCardDrag>['onCardPointerDown']>[1];

function pointerEvent(x = 0, y = 0): PointerEvt {
  return {
    pointerId: 1,
    clientX: x,
    clientY: y,
    button: 0,
    pointerType: 'mouse',
  } as unknown as PointerEvt;
}

function move(x: number, y: number) {
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1 }),
  );
}

function up() {
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
}

const nullRefs = {
  tableRef: { current: null },
  enemyRef: { current: null },
};

describe('useCardDrag', () => {
  it('modo attack sin zona bajo el puntero NO juega (solo agrega la carta a la selección)', () => {
    const toggle = vi.fn();
    const play = vi.fn();
    const { result } = renderHook(() =>
      useCardDrag({
        enabled: true,
        mode: 'attack',
        selectedIds: [],
        canPlay: true,
        toggle,
        play,
        ...nullRefs,
      }),
    );
    result.current.onCardPointerDown('c1', pointerEvent(10, 10));
    move(80, 80);
    up();
    expect(toggle).toHaveBeenCalledWith('c1');
    expect(play).not.toHaveBeenCalled();
    expect(result.current.drag).toBeNull();
  });

  it('modo defend: soltar en cualquier lado descarta si la selección cubre el daño', () => {
    const toggle = vi.fn();
    const discard = vi.fn();
    const { result } = renderHook(() =>
      useCardDrag({
        enabled: true,
        mode: 'defend',
        selectedIds: [],
        canPlay: false,
        canDiscard: true,
        toggle,
        play: vi.fn(),
        discard,
        ...nullRefs,
      }),
    );
    result.current.onCardPointerDown('c9', pointerEvent());
    move(50, 50);
    up();
    expect(toggle).toHaveBeenCalledWith('c9');
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('modo defend con canDiscard false NO descarta (evita derrota silenciosa)', () => {
    const discard = vi.fn();
    const { result } = renderHook(() =>
      useCardDrag({
        enabled: true,
        mode: 'defend',
        selectedIds: ['c1'],
        canPlay: false,
        canDiscard: false,
        toggle: vi.fn(),
        play: vi.fn(),
        discard,
        ...nullRefs,
      }),
    );
    result.current.onCardPointerDown('c2', pointerEvent());
    move(40, 40);
    up();
    expect(discard).not.toHaveBeenCalled();
  });
});
