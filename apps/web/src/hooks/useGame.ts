import { useCallback, useMemo, useRef, useState } from 'react';
import { Game, cardValue, effectiveAttack, validatePlay, victoryLevel as engineVictoryLevel } from '@regicide/engine';
import type { GameState } from '@regicide/engine';

export interface UseGameResult {
  snapshot: GameState;
  seed: number;
  selected: string[];
  selectionValue: number;
  canPlay: boolean;
  canDiscard: boolean;
  victoryLevel: 'gold' | 'silver' | 'bronze' | null;
  error: string | null;
  toggle: (cardId: string) => void;
  clearSelection: () => void;
  play: () => void;
  yieldTurn: () => void;
  discard: () => void;
  jester: () => void;
  newGame: (seed?: number) => void;
}

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Estado del juego 1p conectado al motor: snapshot inmutable + acciones. */
export function useGame(initialSeed?: number): UseGameResult {
  const [seed, setSeed] = useState(initialSeed ?? randomSeed());
  const gameRef = useRef<Game | null>(null);
  if (gameRef.current === null) {
    gameRef.current = new Game({ playerCount: 1, seed });
  }
  const [snapshot, setSnapshot] = useState<GameState>(() => gameRef.current!.snapshot);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((fn: () => void) => {
    try {
      fn();
      setSnapshot(gameRef.current!.snapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    }
  }, []);

  const toggle = useCallback((cardId: string) => {
    setSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  const play = useCallback(() => {
    run(() => {
      gameRef.current!.play(selected);
      setSelected([]);
    });
  }, [run, selected]);

  const yieldTurn = useCallback(() => {
    run(() => {
      gameRef.current!.yield();
      setSelected([]);
    });
  }, [run]);

  const discard = useCallback(() => {
    run(() => {
      gameRef.current!.discard(selected);
      setSelected([]);
    });
  }, [run, selected]);

  const jester = useCallback(() => {
    run(() => {
      gameRef.current!.jester();
      setSelected([]);
    });
  }, [run]);

  const newGame = useCallback((nextSeed?: number) => {
    const s = nextSeed ?? randomSeed();
    setSeed(s);
    gameRef.current = new Game({ playerCount: 1, seed: s });
    setSelected([]);
    setError(null);
    setSnapshot(gameRef.current.snapshot);
  }, []);

  const selectionValue = useMemo(() => {
    const handById = new Map(snapshot.players[0]!.hand.map((card) => [card.id, card]));
    return selected.reduce((acc, id) => acc + cardValue(handById.get(id)!), 0);
  }, [snapshot, selected]);

  const canPlay = useMemo(() => {
    if (snapshot.phase !== 'choose_action' || selected.length === 0) return false;
    try {
      validatePlay(snapshot, selected);
      return true;
    } catch {
      return false;
    }
  }, [snapshot, selected]);

  const canDiscard = useMemo(() => {
    if (snapshot.phase !== 'suffer_damage') return false;
    return selectionValue >= effectiveAttack(snapshot.enemy);
  }, [snapshot, selectionValue]);

  const victoryLevel = useMemo(
    () => (snapshot.result === 'victory' ? engineVictoryLevel(snapshot) : null),
    [snapshot],
  );

  return {
    snapshot,
    seed,
    selected,
    selectionValue,
    canPlay,
    canDiscard,
    victoryLevel,
    error,
    toggle,
    clearSelection,
    play,
    yieldTurn,
    discard,
    jester,
    newGame,
  };
}
