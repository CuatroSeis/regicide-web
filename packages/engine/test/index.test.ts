import { describe, expect, it } from 'vitest';
import { createCastleDeck, createTavernDeck, mulberry32 } from '../src/index.js';

describe('API pública del engine', () => {
  it('expone las funciones de construcción de mazos', () => {
    expect(typeof createCastleDeck).toBe('function');
    expect(typeof createTavernDeck).toBe('function');
    expect(typeof mulberry32).toBe('function');
    expect(createCastleDeck(mulberry32(1))).toHaveLength(12);
  });
});
