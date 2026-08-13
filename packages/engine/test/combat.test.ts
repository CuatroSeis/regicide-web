import { describe, expect, it } from 'vitest';
import {
  applySuitPowers,
  canCoverDamage,
  computeDamage,
  createEnemy,
  drawForDiamonds,
  effectiveAttack,
  healFromDiscard,
  isDefeated,
  isExactKill,
  isPowerBlocked,
} from '../src/combat.js';
import { makePlayer, makeState, enemyCard, numberCard } from './helpers.js';
import type { Card } from '../src/types.js';

describe('createEnemy', () => {
  it('usa los stats de [R-5]: J=10/20, Q=15/30, K=20/40', () => {
    expect(createEnemy(enemyCard('spades', 'J'))).toMatchObject({ attack: 10, maxHealth: 20 });
    expect(createEnemy(enemyCard('hearts', 'Q'))).toMatchObject({ attack: 15, maxHealth: 30 });
    expect(createEnemy(enemyCard('clubs', 'K'))).toMatchObject({ attack: 20, maxHealth: 40 });
  });

  it('arranca sin daño, sin escudo y sin inmunidad anulada', () => {
    const enemy = createEnemy(enemyCard('diamonds', 'J'));
    expect(enemy).toMatchObject({ damageTaken: 0, spadeShield: 0, immunityNegated: false });
  });

  it('rechaza cartas que no son enemigos', () => {
    expect(() => createEnemy(numberCard('hearts', 5))).toThrow();
  });
});

describe('effectiveAttack', () => {
  it('devuelve el ataque base sin picas [R-14]', () => {
    const enemy = createEnemy(enemyCard('clubs', 'J'));
    expect(effectiveAttack(enemy)).toBe(10);
  });

  it('resta el escudo acumulado', () => {
    const enemy = createEnemy(enemyCard('clubs', 'J'));
    enemy.spadeShield = 6;
    expect(effectiveAttack(enemy)).toBe(4);
  });

  it('nunca baja de 0 aunque el escudo supere el ataque', () => {
    const enemy = createEnemy(enemyCard('clubs', 'J'));
    enemy.spadeShield = 12;
    expect(effectiveAttack(enemy)).toBe(0);
  });
});

describe('isDefeated / isExactKill', () => {
  it('derrota al alcanzar la vida máxima', () => {
    const enemy = createEnemy(enemyCard('hearts', 'J'));
    enemy.damageTaken = 20;
    expect(isDefeated(enemy)).toBe(true);
  });

  it('kill exacto cuando el daño es exactamente la vida [R-18]', () => {
    const enemy = createEnemy(enemyCard('hearts', 'J'));
    enemy.damageTaken = 20;
    expect(isExactKill(enemy)).toBe(true);
  });

  it('no es kill exacto si el daño supera la vida', () => {
    const enemy = createEnemy(enemyCard('hearts', 'J'));
    enemy.damageTaken = 21;
    expect(isExactKill(enemy)).toBe(false);
    expect(isDefeated(enemy)).toBe(true);
  });
});

describe('computeDamage', () => {
  it('daña por el valor jugado sin tréboles', () => {
    expect(computeDamage(8, false)).toBe(8);
  });

  it('duplica el daño con tréboles activos [R-13]', () => {
    expect(computeDamage(8, true)).toBe(16);
  });
});

describe('isPowerBlocked', () => {
  it('bloquea el palo que coincide con el enemigo [R-15]', () => {
    const enemy = createEnemy(enemyCard('diamonds', 'J'));
    expect(isPowerBlocked(enemy, 'diamonds')).toBe(true);
    expect(isPowerBlocked(enemy, 'hearts')).toBe(false);
  });

  it('el Jester anula la inmunidad [R-20]', () => {
    const enemy = createEnemy(enemyCard('diamonds', 'J'));
    enemy.immunityNegated = true;
    expect(isPowerBlocked(enemy, 'diamonds')).toBe(false);
  });
});

describe('healFromDiscard', () => {
  const discardCards = (n: number): Card[] =>
    Array.from({ length: n }, (_, i) => numberCard('clubs', 2 + i));

  it('mueve `amount` cartas DEBAJO de la Taverna [R-11]', () => {
    const state = makeState({
      discardPile: discardCards(4),
      tavernDeck: [numberCard('hearts', 9)],
    });
    healFromDiscard(state, 3);
    expect(state.tavernDeck).toHaveLength(4); // 1 original + 3 recuperadas
    expect(state.tavernDeck.slice(0, 3)).toHaveLength(3); // debajo del mazo
    expect(state.discardPile).toHaveLength(1);
  });

  it('si el descarte tiene menos cartas, recupera todas [R-11]', () => {
    const state = makeState({
      discardPile: discardCards(2),
      tavernDeck: [],
    });
    healFromDiscard(state, 5);
    expect(state.tavernDeck).toHaveLength(2);
    expect(state.discardPile).toHaveLength(0);
  });

  it('no hace nada si el descarte está vacío', () => {
    const state = makeState({ tavernDeck: [] });
    healFromDiscard(state, 4);
    expect(state.tavernDeck).toHaveLength(0);
  });
});

describe('drawForDiamonds', () => {
  it('roba hasta el valor jugado empezando por el jugador actual [R-12]', () => {
    const state = makeState({
      players: [makePlayer('p0'), makePlayer('p1', { maxHandSize: 7 })],
      tavernDeck: Array.from({ length: 10 }, () => numberCard('spades', 2)),
    });
    drawForDiamonds(state, 5);
    // 5 cartas repartidas: p0 (1), p1 (1), p0 (1), p1 (1), p0 (1)
    expect(state.players[0]!.hand).toHaveLength(3);
    expect(state.players[1]!.hand).toHaveLength(2);
    expect(state.tavernDeck).toHaveLength(5);
  });

  it('saltea a quien tiene la mano llena [R-12]', () => {
    const state = makeState({
      players: [
        makePlayer('p0', { maxHandSize: 1, hand: [numberCard('clubs', 2)] }),
        makePlayer('p1', { maxHandSize: 7 }),
      ],
      tavernDeck: Array.from({ length: 10 }, () => numberCard('spades', 2)),
    });
    drawForDiamonds(state, 4);
    expect(state.players[0]!.hand).toHaveLength(1); // sigue llena
    expect(state.players[1]!.hand).toHaveLength(4);
  });

  it('se detiene si el mazo de robo se vacía, sin penalidad [R-12]', () => {
    const state = makeState({
      tavernDeck: [numberCard('clubs', 7)],
    });
    drawForDiamonds(state, 5);
    expect(state.players[0]!.hand).toHaveLength(1);
    expect(state.tavernDeck).toHaveLength(0);
  });
});

describe('applySuitPowers', () => {
  it('activa el doble daño con tréboles [R-13]', () => {
    const state = makeState();
    const { clubsActive } = applySuitPowers(state, ['clubs'], 8);
    expect(clubsActive).toBe(true);
  });

  it('acumula el escudo de picas [R-14]', () => {
    const state = makeState();
    applySuitPowers(state, ['spades'], 5);
    applySuitPowers(state, ['spades'], 3);
    expect(state.enemy.spadeShield).toBe(8);
  });

  it('no activa el poder bloqueado por inmunidad, pero el palo se ignora [R-15]', () => {
    const state = makeState();
    state.enemy = createEnemy(enemyCard('diamonds', 'J'));
    const { clubsActive } = applySuitPowers(state, ['diamonds', 'clubs'], 4);
    expect(clubsActive).toBe(true); // clubs sí se activa
    expect(state.players[0]!.hand).toHaveLength(0); // diamonds NO robó
  });

  it('resuelve ♥ antes que ♦ cuando van juntos [R-16]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('clubs', 'J')),
      discardPile: [numberCard('clubs', 3), numberCard('clubs', 4), numberCard('clubs', 5)],
      tavernDeck: [],
    });
    applySuitPowers(state, ['hearts', 'diamonds'], 3);
    // ♥ recuperó 3 cartas del descarte a la Taverna; luego ♦ robó de esas mismas 3
    expect(state.discardPile).toHaveLength(0);
    expect(state.players[0]!.hand).toHaveLength(3);
    expect(state.tavernDeck).toHaveLength(0);
  });
});

describe('canCoverDamage', () => {
  it('cubre si la suma es al menos el ataque efectivo [R-19]', () => {
    const enemy = createEnemy(enemyCard('clubs', 'J'));
    expect(canCoverDamage(enemy, [numberCard('hearts', 10)])).toBe(true);
    expect(canCoverDamage(enemy, [numberCard('hearts', 9)])).toBe(false);
  });

  it('considera el escudo de picas al calcular el ataque efectivo', () => {
    const enemy = createEnemy(enemyCard('clubs', 'J'));
    enemy.spadeShield = 5;
    expect(canCoverDamage(enemy, [numberCard('hearts', 5)])).toBe(true);
  });
});
