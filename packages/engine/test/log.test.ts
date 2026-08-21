import { describe, expect, it } from 'vitest';
import { createEnemy } from '../src/combat.js';
import { createGame } from '../src/game.js';
import { jesterSolo, playCards, playJester, yieldTurn } from '../src/turn.js';
import type { LogEntry } from '../src/types.js';
import {
  aceCard,
  enemyCard,
  jesterCard,
  makePlayer,
  makeState,
  numberCard,
} from './helpers.js';

function id(card: { id: string }): string {
  return card.id;
}

describe('log estructurado', () => {
  it('createGame registra game_start con la cantidad de jugadores', () => {
    const state = createGame({ seed: 1, playerCount: 3 });
    expect(state.log).toEqual([{ key: 'game_start', args: { count: 3 } }]);
  });

  it('playCards registra jugador, cantidad, valor y daño', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 4)] })],
    });
    playCards(state, [id(numberCard('hearts', 4)), id(numberCard('spades', 4))]);
    const last = state.log.at(-1) as LogEntry;
    expect(last.key).toBe('play_cards');
    expect(last.args).toEqual({ player: 'p0', count: 2, value: 8, damage: 8 });
  });

  it('yieldTurn registra al jugador que se rinde', () => {
    const state = makeState({ players: [makePlayer('p0'), makePlayer('p1')] });
    yieldTurn(state);
    const last = state.log.at(-1) as LogEntry;
    expect(last.key).toBe('yield');
    expect(last.args).toEqual({ player: 'p0' });
  });

  it('jesterSolo registra la activación sin args', () => {
    const state = makeState({
      players: [makePlayer('p0', { hand: [jesterCard(), aceCard('hearts')] })],
    });
    state.table.push({ playerId: 'p0', card: aceCard('hearts') });
    state.phase = 'suffer_damage';
    jesterSolo(state);
    const last = state.log.at(-1) as LogEntry;
    expect(last.key).toBe('jester_solo');
    expect(last.args).toBeUndefined();
  });

  it('playJester registra quién lo juega y a quién elige', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('clubs', 'J')),
      players: [
        makePlayer('p0', { hand: [jesterCard()] }),
        makePlayer('p1', { hand: [numberCard('hearts', 4)] }),
      ],
    });
    playJester(state, 1);
    const last = state.log.at(-1) as LogEntry;
    expect(last.key).toBe('jester_multi');
    expect(last.args).toEqual({ player: 'p0', target: 'p1' });
  });

  it('la derrota por no cubrir el ataque se registra sin args', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'K')),
      players: [makePlayer('p0', { hand: [numberCard('hearts', 2)] })],
      jestersLeft: 0,
    });
    playCards(state, [id(numberCard('hearts', 2))]);
    const last = state.log.at(-2) as LogEntry;
    expect(last.key).toBe('cover_fail_defeat');
    expect(last.args).toBeUndefined();
    expect(state.gameOver).toBe(true);
  });
});
