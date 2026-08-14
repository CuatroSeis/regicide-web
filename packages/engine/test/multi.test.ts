import { describe, expect, it } from 'vitest';
import { canYield, discardToSurvive, playCards, yieldTurn } from '../src/turn.js';
import { createEnemy } from '../src/combat.js';
import { makePlayer, makeState, aceCard, enemyCard, numberCard } from './helpers.js';

const id = (card: { id: string }): string => card.id;

function threePlayers() {
  return [
    makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 5), numberCard('clubs', 6), numberCard('diamonds', 3)] }),
    makePlayer('p1', { hand: [numberCard('diamonds', 4), numberCard('spades', 5), numberCard('clubs', 6), numberCard('diamonds', 3)] }),
    makePlayer('p2', { hand: [numberCard('clubs', 4), numberCard('spades', 5), numberCard('clubs', 6), numberCard('diamonds', 3)] }),
  ];
}

describe('flujo multijugador (2-4 jugadores)', () => {
  it('el turno rota en sentido horario tras jugar y cubrir [R-19]', () => {
    const state = makeState({ enemy: createEnemy(enemyCard('spades', 'J')), players: threePlayers() });

    playCards(state, [id(numberCard('hearts', 4))]);
    discardToSurvive(state, [id(numberCard('spades', 5)), id(numberCard('clubs', 6))]);
    expect(state.currentPlayerIndex).toBe(1);

    playCards(state, [id(numberCard('diamonds', 4))]);
    discardToSurvive(state, [id(numberCard('spades', 5)), id(numberCard('clubs', 6))]);
    expect(state.currentPlayerIndex).toBe(2);

    playCards(state, [id(numberCard('clubs', 4))]);
    discardToSurvive(state, [id(numberCard('spades', 5)), id(numberCard('clubs', 6))]);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.enemy.damageTaken).toBe(16); // 4 + 4 + 8 (tréboles)
  });

  it('el derrotador no pierde el turno al revelar un enemigo nuevo [R-18](iv)', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.damageTaken = 19;
    const state = makeState({
      enemy,
      players: [makePlayer('p0', { hand: [aceCard('hearts'), numberCard('hearts', 4)] }), makePlayer('p1', { hand: [] })],
    });
    playCards(state, [id(aceCard('hearts'))]); // 19 + 1 = 20 → kill exacto
    expect(state.enemy.damageTaken).toBe(0); // enemigo nuevo, vida reseteada
    expect(state.enemy.card).not.toBe(enemy.card); // nueva instancia del castillo
    expect(state.tavernDeck[state.tavernDeck.length - 1]).toEqual(enemy.card); // [R-18](i)
    expect(state.phase).toBe('choose_action');
    expect(state.currentPlayerIndex).toBe(0); // [R-18](iv)
  });

  it('rendiciones consecutivas bloquean al siguiente en 3p [R-9]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 5), numberCard('clubs', 6)] }), makePlayer('p1', { hand: [numberCard('diamonds', 4), numberCard('spades', 5), numberCard('clubs', 6)] }), makePlayer('p2', { hand: [numberCard('clubs', 4)] })],
    });

    yieldTurn(state); // p0 se rinde
    discardToSurvive(state, [id(numberCard('hearts', 4)), id(numberCard('spades', 5)), id(numberCard('clubs', 6))]);
    expect(state.consecutiveYields).toBe(1);

    yieldTurn(state); // p1 se rinde
    discardToSurvive(state, [id(numberCard('diamonds', 4)), id(numberCard('spades', 5)), id(numberCard('clubs', 6))]);
    expect(state.consecutiveYields).toBe(2);

    expect(state.currentPlayerIndex).toBe(2);
    expect(canYield(state)).toBe(false);
    expect(() => yieldTurn(state)).toThrow();
  });

  it('jugar una carta de enemigo aplica su valor y poder de palo [R-24]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [
        makePlayer('p0', { hand: [enemyCard('hearts', 'J'), numberCard('spades', 5), numberCard('clubs', 6)] }),
        makePlayer('p1', { hand: [] }),
      ],
    });
    playCards(state, [id(enemyCard('hearts', 'J'))]);
    expect(state.enemy.damageTaken).toBe(10);
    expect(state.phase).toBe('suffer_damage');
  });

  it('la Taverna se recarga repartiendo en sentido horario [R-12]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      tavernDeck: [
        numberCard('diamonds', 2), numberCard('clubs', 3), numberCard('hearts', 4),
        numberCard('spades', 5), numberCard('diamonds', 6), numberCard('clubs', 7),
      ],
      players: [
        makePlayer('p0', { hand: [numberCard('diamonds', 4), numberCard('spades', 5), numberCard('clubs', 6)] }),
        makePlayer('p1', { hand: [] }),
        makePlayer('p2', { hand: [] }),
      ],
    });
    playCards(state, [id(numberCard('diamonds', 4))]); // roba 4
    // p0 roba primero, luego p1 y p2, y de nuevo p0
    expect(state.players[0]!.hand).toHaveLength(4); // [5♠ 6♣] + 2♦ + 5♠
    expect(state.players[1]!.hand).toHaveLength(1); // 3♣
    expect(state.players[2]!.hand).toHaveLength(1); // 4♥
    expect(state.tavernDeck).toHaveLength(2); // quedan 6♦ 7♣
  });
});
