import { describe, expect, it } from 'vitest';
import { createGame, Game } from '../src/game.js';
import { cardValue } from '../src/deck.js';

describe('createGame', () => {
  it('prepara una partida solo: mano 8, enemigo Jota, 2 Jesters al costado [R-1][R-2][R-22]', () => {
    const state = createGame({ playerCount: 1, seed: 42 });
    expect(state.players).toHaveLength(1);
    expect(state.players[0]!.hand).toHaveLength(8);
    expect(state.players[0]!.maxHandSize).toBe(8);
    expect(state.castleDeck).toHaveLength(11);
    expect(state.tavernDeck).toHaveLength(32); // 40 - 8 de la mano
    expect(state.enemy.card.rank).toBe('J');
    expect(state.phase).toBe('choose_action');
    expect(state.jestersLeft).toBe(2);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnNumber).toBe(1);
    expect(state.gameOver).toBe(false);
    expect(state.result).toBeNull();
  });

  it('multijugador: manos 7/6/5 y Jesters dentro del mazo según jugadores [R-2]', () => {
    const two = createGame({ playerCount: 2, seed: 1 });
    expect(two.players.map((p) => p.hand.length)).toEqual([7, 7]);
    expect(two.tavernDeck).toHaveLength(26); // 40 - 14 de las manos
    expect(two.jestersLeft).toBe(0);

    const three = createGame({ playerCount: 3, seed: 1 });
    expect(three.players.map((p) => p.hand.length)).toEqual([6, 6, 6]);
    expect(three.tavernDeck).toHaveLength(23); // 41 - 18 de las manos
    expect(three.jestersLeft).toBe(0);

    const four = createGame({ playerCount: 4, seed: 1 });
    expect(four.players.map((p) => p.hand.length)).toEqual([5, 5, 5, 5]);
    expect(four.tavernDeck).toHaveLength(22); // 42 - 20 de las manos
    expect(four.jestersLeft).toBe(0);
  });

  it('es determinista con la misma semilla', () => {
    const a = createGame({ playerCount: 1, seed: 7 });
    const b = createGame({ playerCount: 1, seed: 7 });
    expect(a.players[0]!.hand.map((c) => c.id)).toEqual(b.players[0]!.hand.map((c) => c.id));
    expect(a.enemy.card.id).toBe(b.enemy.card.id);
  });

  it('rechaza cantidades de jugadores inválidas', () => {
    expect(() => createGame({ playerCount: 0 })).toThrow();
    expect(() => createGame({ playerCount: 5 })).toThrow();
  });

  it('respeta los playerIds provistos', () => {
    const state = createGame({ playerCount: 2, playerIds: ['ana', 'luis'] });
    expect(state.players.map((p) => p.id)).toEqual(['ana', 'luis']);
    expect(() => createGame({ playerCount: 2, playerIds: ['solo'] })).toThrow();
  });

  it('nunca roba por encima del máximo de mano', () => {
    const state = createGame({ playerCount: 4, seed: 1 });
    expect(state.players[0]!.hand.length).toBeLessThanOrEqual(5);
  });
});

describe('Game (fachada inmutable)', () => {
  it('aísla el estado: mutar el snapshot no afecta al juego', () => {
    const game = new Game({ playerCount: 1, seed: 3 });
    const snapshot = game.snapshot;
    snapshot.players[0]!.hand = [];
    expect(game.snapshot.players[0]!.hand).toHaveLength(8);
  });

  it('play() mueve las cartas a la mesa y pasa a la fase de sufrir daño [R-17]', () => {
    const game = new Game({ playerCount: 1, seed: 3 });
    const hand = game.snapshot.players[0]!.hand;
    const first = hand.find((c) => c.kind !== 'ace')!;
    const result = game.play([first.id]);
    expect(result.damageDealt).toBe(cardValue(first));
    const s = game.snapshot;
    expect(s.table).toHaveLength(1);
    expect(s.players[0]!.hand).toHaveLength(7);
    expect(s.phase).toBe('suffer_damage');
    expect(s.consecutiveYields).toBe(0);
  });

  it('yield() va directo a la fase de sufrir daño [R-9]', () => {
    const game = new Game({ playerCount: 1, seed: 3 });
    game.yield();
    const s = game.snapshot;
    expect(s.phase).toBe('suffer_damage');
    expect(s.consecutiveYields).toBe(1);
  });

  it('jester() descarta la mano y recarga al máximo [R-22]', () => {
    const game = new Game({ playerCount: 1, seed: 3 });
    const before = game.snapshot.players[0]!.hand;
    game.jester();
    const after = game.snapshot.players[0]!.hand;
    expect(after).toHaveLength(8);
    expect(after.map((c) => c.id)).not.toEqual(before.map((c) => c.id));
    expect(game.snapshot.jestersUsed).toBe(1);
  });

  it('reporta estado inicial sin partida terminada', () => {
    const game = new Game({ playerCount: 1, seed: 3 });
    expect(game.over).toBe(false);
    expect(game.result).toBeNull();
    expect(game.victoryLevel).toBeNull();
  });
});
