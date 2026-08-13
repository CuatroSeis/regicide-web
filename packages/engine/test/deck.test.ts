import { describe, expect, it } from 'vitest';
import {
  cardValue,
  createCastleDeck,
  createTavernDeck,
  maxHandSize,
  mulberry32,
  shuffle,
} from '../src/deck.js';
import type { Card } from '../src/types.js';

describe('mulberry32', () => {
  it('es determinista para una misma semilla', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('devuelve valores en [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('conserva el conjunto de elementos', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, mulberry32(1));
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(out).toHaveLength(input.length);
  });

  it('es determinista con la misma semilla y distinto con otra', () => {
    const input = Array.from({ length: 52 }, (_, i) => i);
    const out1 = shuffle(input, mulberry32(99));
    const out2 = shuffle(input, mulberry32(99));
    const out3 = shuffle(input, mulberry32(100));
    expect(out1).toEqual(out2);
    expect(out1).not.toEqual(out3);
  });
});

describe('createCastleDeck', () => {
  it('tiene 12 enemigos: 4 Jotas, 4 Reinas, 4 Reyes', () => {
    const deck = createCastleDeck(mulberry32(0));
    expect(deck).toHaveLength(12);
    const byRank = (r: string) => deck.filter((c) => c.rank === r).length;
    expect(byRank('J')).toBe(4);
    expect(byRank('Q')).toBe(4);
    expect(byRank('K')).toBe(4);
  });

  it('las 4 Jotas quedan al tope (primeros enemigos revelados) [R-1]', () => {
    const deck = createCastleDeck(mulberry32(0));
    const top4 = deck.slice(-4);
    expect(top4.every((c) => c.rank === 'J')).toBe(true);
  });

  it('los 4 Reyes quedan al fondo [R-1]', () => {
    const deck = createCastleDeck(mulberry32(0));
    const bottom4 = deck.slice(0, 4);
    expect(bottom4.every((c) => c.rank === 'K')).toBe(true);
  });

  it('cada carta tiene id único', () => {
    const deck = createCastleDeck(mulberry32(5));
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });
});

describe('createTavernDeck', () => {
  it('1 jugador: 40 cartas (36 números + 4 Ases), sin Jesters [R-2]', () => {
    const deck = createTavernDeck(1, mulberry32(0));
    expect(deck).toHaveLength(40);
    expect(deck.filter((c) => c.kind === 'jester')).toHaveLength(0);
    expect(deck.filter((c) => c.kind === 'ace')).toHaveLength(4);
    expect(deck.filter((c) => c.kind === 'number')).toHaveLength(36);
  });

  it('2 jugadores: 40 cartas, sin Jesters [R-2]', () => {
    const deck = createTavernDeck(2, mulberry32(0));
    expect(deck).toHaveLength(40);
    expect(deck.filter((c) => c.kind === 'jester')).toHaveLength(0);
  });

  it('3 jugadores: 1 Jester; 4 jugadores: 2 Jesters [R-2]', () => {
    expect(createTavernDeck(3, mulberry32(0)).filter((c) => c.kind === 'jester')).toHaveLength(1);
    expect(createTavernDeck(4, mulberry32(0)).filter((c) => c.kind === 'jester')).toHaveLength(2);
  });

  it('rechaza cantidades de jugadores inválidas', () => {
    expect(() => createTavernDeck(0, mulberry32(0))).toThrow(RangeError);
    expect(() => createTavernDeck(5, mulberry32(0))).toThrow(RangeError);
  });
});

describe('maxHandSize', () => {
  it('1p=8, 2p=7, 3p=6, 4p=5 [R-2]', () => {
    expect(maxHandSize(1)).toBe(8);
    expect(maxHandSize(2)).toBe(7);
    expect(maxHandSize(3)).toBe(6);
    expect(maxHandSize(4)).toBe(5);
  });
});

describe('cardValue', () => {
  const card = (id: string, kind: Card['kind'], rank: Card['rank']): Card => ({
    id,
    kind,
    rank,
    suit: 'clubs',
  });

  it('números valen su rango [R-6]', () => {
    expect(cardValue(card('c2', 'number', 2))).toBe(2);
    expect(cardValue(card('c10', 'number', 10))).toBe(10);
  });

  it('Ases valen 1 [R-8]', () => {
    expect(cardValue(card('a', 'ace', 'A'))).toBe(1);
  });

  it('enemigos valen 10/15/20 [R-24]', () => {
    expect(cardValue(card('j', 'enemy', 'J'))).toBe(10);
    expect(cardValue(card('q', 'enemy', 'Q'))).toBe(15);
    expect(cardValue(card('k', 'enemy', 'K'))).toBe(20);
  });

  it('Jester vale 0 [R-20]', () => {
    expect(cardValue(card('jester', 'jester', null))).toBe(0);
  });
});
