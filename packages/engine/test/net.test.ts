import { describe, expect, it } from 'vitest';
import { makeState, makePlayer, numberCard, enemyCard } from './helpers.js';
import { playerSnapshot, publicSnapshot } from '../src/net.js';

describe('publicSnapshot', () => {
  it('oculta las manos, el castillo y la Taverna; expone conteos y el resto público', () => {
    const state = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 7)] })],
      castleDeck: [enemyCard('spades', 'K')],
      tavernDeck: [numberCard('diamonds', 5)],
      discardPile: [numberCard('clubs', 3)],
      table: [{ playerId: 'p0', card: numberCard('spades', 4) }],
    });

    const view = publicSnapshot(state);

    expect(view.players[0]).toEqual({ id: 'p0', maxHandSize: 8, handCount: 1 });
    expect(view.castleCount).toBe(1);
    expect(view.tavernCount).toBe(1);
    expect(view.discardPile).toHaveLength(1);
    expect(view.table).toHaveLength(1);
    expect(view.enemy.card).toBeDefined();
    expect(view.log).toEqual(state.log);
  });

  it('la vista pública no contiene las cartas del castillo ni de la Taverna', () => {
    const castleCard = enemyCard('hearts', 'K');
    const tavernCard = numberCard('spades', 9);
    const view = publicSnapshot(makeState({ castleDeck: [castleCard], tavernDeck: [tavernCard] }));

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain(castleCard.id);
    expect(serialized).not.toContain(tavernCard.id);
  });

  it('la vista pública no contiene las cartas de ninguna mano', () => {
    const handCard = numberCard('clubs', 8);
    const view = publicSnapshot(makeState({ players: [makePlayer('p0', { hand: [handCard] })] }));

    expect(JSON.stringify(view)).not.toContain(handCard.id);
  });
});

describe('playerSnapshot', () => {
  it('incluye la mano propia y el flag de turno', () => {
    const own = numberCard('hearts', 6);
    const state = makeState({
      players: [makePlayer('p0', { hand: [own] }), makePlayer('p1')],
      currentPlayerIndex: 0,
    });

    const view = playerSnapshot(state, 'p0');

    expect(view.playerId).toBe('p0');
    expect(view.hand).toEqual([own]);
    expect(view.isMyTurn).toBe(true);
    expect(view.players).toHaveLength(2);
  });

  it('isMyTurn es false para quien no tiene el turno', () => {
    const state = makeState({ players: [makePlayer('p0'), makePlayer('p1')], currentPlayerIndex: 1 });
    expect(playerSnapshot(state, 'p0').isMyTurn).toBe(false);
    expect(playerSnapshot(state, 'p1').isMyTurn).toBe(true);
  });

  it('lanza error para un jugador desconocido', () => {
    const state = makeState();
    expect(() => playerSnapshot(state, 'nadie')).toThrow();
  });
});
