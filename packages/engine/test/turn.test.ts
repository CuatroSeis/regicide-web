import { describe, expect, it } from 'vitest';
import {
  canYield,
  discardToSurvive,
  isStuck,
  jesterSolo,
  playCards,
  playJester,
  validatePlay,
  victoryLevel,
  yieldTurn,
} from '../src/turn.js';
import { createEnemy } from '../src/combat.js';
import {
  makePlayer,
  makeState,
  aceCard,
  enemyCard,
  jesterCard,
  numberCard,
} from './helpers.js';

const id = (card: { id: string }): string => card.id;

describe('validatePlay', () => {
  const enemy = enemyCard('spades', 'J');
  const state = makeState({
    enemy: createEnemy(enemy),
    players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('hearts', 6)] })],
  });

  it('acepta una sola carta [R-6]', () => {
    expect(validatePlay(state, [id(numberCard('hearts', 4))])).toHaveLength(1);
  });

  it('acepta un As solo y un As con otra carta [R-8]', () => {
    const s = makeState({ players: [makePlayer('p0', { hand: [aceCard('hearts'), numberCard('spades', 7)] })] });
    expect(validatePlay(s, [id(aceCard('hearts'))])).toHaveLength(1);
    expect(validatePlay(s, [id(aceCard('hearts')), id(numberCard('spades', 7))])).toHaveLength(2);
  });

  it('acepta dos Ases juntos [R-8]', () => {
    const s = makeState({ players: [makePlayer('p0', { hand: [aceCard('hearts'), aceCard('spades')] })] });
    expect(validatePlay(s, [id(aceCard('hearts')), id(aceCard('spades'))])).toHaveLength(2);
  });

  it('rechaza Ases en combos de 3 o más [R-8]', () => {
    const s = makeState({
      players: [makePlayer('p0', { hand: [aceCard('hearts'), numberCard('hearts', 2), numberCard('spades', 2)] })],
    });
    expect(() => validatePlay(s, [id(aceCard('hearts')), id(numberCard('hearts', 2)), id(numberCard('spades', 2))])).toThrow();
  });

  it('acepta pares de 2s-5s y rechaza pares con suma > 10 [R-7]', () => {
    const s = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 5), numberCard('spades', 5), numberCard('clubs', 6), numberCard('diamonds', 6)] })],
    });
    expect(validatePlay(s, [id(numberCard('hearts', 5)), id(numberCard('spades', 5))])).toHaveLength(2);
    expect(() => validatePlay(s, [id(numberCard('clubs', 6)), id(numberCard('diamonds', 6))])).toThrow();
  });

  it('acepta triples de 2s-3s y cuádruple de 2s [R-7]', () => {
    const s = makeState({
      players: [
        makePlayer('p0', {
          hand: [
            numberCard('hearts', 2), numberCard('spades', 2), numberCard('clubs', 2), numberCard('diamonds', 2),
            numberCard('hearts', 3), numberCard('spades', 3), numberCard('clubs', 3),
          ],
        }),
      ],
    });
    expect(validatePlay(s, [id(numberCard('hearts', 2)), id(numberCard('spades', 2)), id(numberCard('clubs', 2))])).toHaveLength(3);
    expect(validatePlay(s, [id(numberCard('hearts', 3)), id(numberCard('spades', 3)), id(numberCard('clubs', 3))])).toHaveLength(3);
    expect(validatePlay(s, [id(numberCard('hearts', 2)), id(numberCard('spades', 2)), id(numberCard('clubs', 2)), id(numberCard('diamonds', 2))])).toHaveLength(4);
  });

  it('rechaza triples con suma > 10 [R-7]', () => {
    const s = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 4), numberCard('clubs', 4)] })],
    });
    expect(() => validatePlay(s, [id(numberCard('hearts', 4)), id(numberCard('spades', 4)), id(numberCard('clubs', 4))])).toThrow();
  });

  it('rechaza combos de números distintos y de 2 cartas con números distintos', () => {
    const s = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 2), numberCard('spades', 3)] })],
    });
    expect(() => validatePlay(s, [id(numberCard('hearts', 2)), id(numberCard('spades', 3))])).toThrow();
  });

  it('permite una carta enemiga suelta pero no dos jacks juntos (suma > 10) [R-24]', () => {
    const s = makeState({
      players: [makePlayer('p0', { hand: [enemyCard('hearts', 'J'), enemyCard('spades', 'J')] })],
    });
    expect(validatePlay(s, [id(enemyCard('hearts', 'J'))])).toHaveLength(1);
    expect(() => validatePlay(s, [id(enemyCard('hearts', 'J')), id(enemyCard('spades', 'J'))])).toThrow();
  });

  it('rechaza cartas fuera de la mano, repetidas y jugadas en otra fase', () => {
    expect(() => validatePlay(state, ['no-existe'])).toThrow();
    const dup = makeState({ players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })] });
    expect(() => validatePlay(dup, [id(numberCard('hearts', 4)), id(numberCard('hearts', 4))])).toThrow();
    const sufriendo = makeState({ phase: 'suffer_damage', players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })] });
    expect(() => validatePlay(sufriendo, [id(numberCard('hearts', 4))])).toThrow();
  });
});

describe('playCards', () => {
  it('mueve las cartas a la mesa y aplica el daño total [R-17]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 4)] })],
    });
    const result = playCards(state, [id(numberCard('hearts', 4)), id(numberCard('spades', 4))]);
    expect(result.damageDealt).toBe(8);
    expect(state.lastDamageDealt).toBe(8);
    expect(state.enemy.damageTaken).toBe(8);
    expect(state.table).toHaveLength(2);
    expect(state.players[0]!.hand).toHaveLength(0);
    expect(state.phase).toBe('suffer_damage');
  });

  it('duplica el daño si el poder de tréboles está activo [R-13]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [makePlayer('p0', { hand: [numberCard('clubs', 5)] })],
    });
    const result = playCards(state, [id(numberCard('clubs', 5))]);
    expect(result.clubsActive).toBe(true);
    expect(result.damageDealt).toBe(10);
    expect(state.lastDamageDealt).toBe(10);
    expect(state.enemy.damageTaken).toBe(10);
  });

  it('derrota sin kill exacto: enemigo al descarte y cartas jugadas al descarte [R-18]', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.damageTaken = 15; // daño acumulado en turnos anteriores
    const state = makeState({
      enemy,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 7)] })],
    });
    const castleLength = state.castleDeck.length;
    const defeatedCard = enemy.card;
    const result = playCards(state, [id(numberCard('hearts', 7))]);
    expect(result.enemyDefeated).toBe(true);
    expect(result.exactKill).toBe(false);
    expect(state.discardPile).toContainEqual(defeatedCard);
    expect(state.discardPile).toContainEqual(numberCard('hearts', 7));
    expect(state.castleDeck).toHaveLength(castleLength - 1);
    expect(state.phase).toBe('choose_action');
  });

  it('kill exacto: enemigo boca abajo al tope de la Taverna [R-18](i)', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.damageTaken = 19;
    const state = makeState({
      enemy,
      players: [makePlayer('p0', { hand: [aceCard('hearts')] })],
      tavernDeck: [numberCard('clubs', 2)],
    });
    const result = playCards(state, [id(aceCard('hearts'))]);
    expect(result.exactKill).toBe(true);
    expect(state.tavernDeck[state.tavernDeck.length - 1]).toEqual(enemy.card);
    expect(state.discardPile).not.toContainEqual(enemy.card);
  });

  it('victoria al derrotar al último Rey [R-25]', () => {
    const enemy = createEnemy(enemyCard('spades', 'K'));
    enemy.damageTaken = 39;
    const state = makeState({
      enemy,
      castleDeck: [],
      players: [makePlayer('p0', { hand: [aceCard('hearts')] })],
    });
    const result = playCards(state, [id(aceCard('hearts'))]);
    expect(result.victory).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('victory');
    expect(state.phase).toBe('game_over');
  });

  it('el derrotador empieza el nuevo turno contra el enemigo revelado [R-18](iv)', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')),
      players: [makePlayer('p0', { hand: [enemyCard('hearts', 'K')] })], // valor 20 [R-24]
    });
    const before = state.currentPlayerIndex;
    const result = playCards(state, [id(enemyCard('hearts', 'K'))]);
    expect(result.enemyDefeated).toBe(true);
    expect(state.currentPlayerIndex).toBe(before);
    expect(state.enemy.card.kind).toBe('enemy');
  });

  it('muere si tras jugar la mano no alcanza para cubrir el ataque [R-19]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      jestersLeft: 0,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 2)] })],
    });
    playCards(state, [id(numberCard('hearts', 2))]); // mano queda vacía
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.phase).toBe('game_over');
  });
});

describe('yieldTurn / canYield [R-9]', () => {
  it('en solo siempre se permite rendirse', () => {
    const state = makeState({ consecutiveYields: 1 });
    expect(canYield(state)).toBe(true);
    yieldTurn(state);
    expect(state.phase).toBe('suffer_damage');
    expect(state.consecutiveYields).toBe(2);
  });

  it('en multijugador se bloquea cuando todos los demás se rindieron', () => {
    const state = makeState({
      players: [makePlayer('p0'), makePlayer('p1')],
      consecutiveYields: 1,
    });
    expect(canYield(state)).toBe(false);
    expect(() => yieldTurn(state)).toThrow();
  });

  it('en multijugador se permite si no todos se rindieron', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      players: [
        makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 6)] }),
        makePlayer('p1'),
      ],
      consecutiveYields: 0,
    });
    expect(canYield(state)).toBe(true);
    yieldTurn(state);
    expect(state.phase).toBe('suffer_damage');
  });

  it('no permite rendirse fuera del paso 1', () => {
    const state = makeState({ phase: 'suffer_damage' });
    expect(() => yieldTurn(state)).toThrow();
  });

  it('muere en el acto si la mano no alcanza y no hay Jesters [R-25]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      jestersLeft: 0,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 2)] })],
    });
    yieldTurn(state);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.phase).toBe('game_over');
  });

  it('en solo con Jester disponible no muere al rendirse (puede recargar [R-22])', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      jestersLeft: 1,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 2)] })],
    });
    yieldTurn(state);
    expect(state.gameOver).toBe(false);
    expect(state.phase).toBe('suffer_damage');
  });
});

describe('discardToSurvive [R-19]', () => {
  it('cubre el ataque efectivo y avanza el turno', () => {
    const state = makeState({
      phase: 'suffer_damage',
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 6)] }), makePlayer('p1', { hand: [numberCard('hearts', 2)] })],
    });
    discardToSurvive(state, [id(numberCard('hearts', 4)), id(numberCard('spades', 6))]);
    expect(state.gameOver).toBe(false);
    expect(state.discardPile).toContainEqual(numberCard('hearts', 4));
    expect(state.players[0]!.hand).toHaveLength(0);
    expect(state.phase).toBe('choose_action');
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(2);
  });

  it('reduce la exigencia con el escudo de picas [R-14]', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.spadeShield = 6; // ataque efectivo 4
    const state = makeState({
      phase: 'suffer_damage',
      enemy,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })],
    });
    discardToSurvive(state, [id(numberCard('hearts', 4))]);
    expect(state.gameOver).toBe(false);
  });

  it('no cubre con ataque efectivo 0', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.spadeShield = 10; // ataque efectivo 0
    const state = makeState({
      phase: 'suffer_damage',
      enemy,
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })],
    });
    discardToSurvive(state, []);
    expect(state.gameOver).toBe(false);
  });

  it('muere si no cubre el ataque [R-25]', () => {
    const state = makeState({
      phase: 'suffer_damage',
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })],
    });
    discardToSurvive(state, [id(numberCard('hearts', 4))]);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.phase).toBe('game_over');
  });

  it('rechaza llamadas fuera de la fase de sufrir daño', () => {
    const state = makeState({ phase: 'choose_action' });
    expect(() => discardToSurvive(state, [])).toThrow();
  });

  it('las cartas jugadas permanecen en la mesa hasta derrotar al enemigo [R-18](ii)', () => {
    const enemy = createEnemy(enemyCard('spades', 'J')); // ataque 10
    const state = makeState({
      phase: 'suffer_damage',
      enemy,
      table: [{ playerId: 'p0', card: numberCard('hearts', 5) }],
      players: [
        makePlayer('p0', { hand: [numberCard('hearts', 4), numberCard('spades', 6)] }),
        makePlayer('p1', { hand: [numberCard('clubs', 2)] }),
      ],
    });
    discardToSurvive(state, [id(numberCard('hearts', 4)), id(numberCard('spades', 6))]);
    expect(state.table).toHaveLength(1);
    expect(state.table[0]!.card).toEqual(numberCard('hearts', 5));
    expect(state.discardPile).toContainEqual(numberCard('hearts', 4));
    expect(state.discardPile).toContainEqual(numberCard('spades', 6));
  });
});

describe('jesterSolo [R-22]', () => {
  it('descarta la mano y recarga al máximo', () => {
    const state = makeState({
      players: [makePlayer('p0', { maxHandSize: 8, hand: [numberCard('hearts', 4)] })],
      tavernDeck: Array.from({ length: 12 }, () => numberCard('spades', 2)),
    });
    jesterSolo(state);
    expect(state.players[0]!.hand).toHaveLength(8);
    expect(state.discardPile).toHaveLength(1);
    expect(state.jestersLeft).toBe(1);
    expect(state.jestersUsed).toBe(1);
  });

  it('solo funciona con un jugador y con Jesters disponibles', () => {
    const multi = makeState({
      players: [makePlayer('p0'), makePlayer('p1')],
    });
    expect(() => jesterSolo(multi)).toThrow();
    const sinJesters = makeState({ jestersLeft: 0 });
    expect(() => jesterSolo(sinJesters)).toThrow();
  });

  it('no cambia la fase (se usa al inicio del paso 1 o del paso 4)', () => {
    const state = makeState({
      phase: 'suffer_damage',
      tavernDeck: Array.from({ length: 8 }, () => numberCard('spades', 2)),
    });
    jesterSolo(state);
    expect(state.phase).toBe('suffer_damage');
  });

  it('muere si la recarga no alcanza y se agotó el último Jester [R-22][R-25]', () => {
    const state = makeState({
      phase: 'suffer_damage',
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      jestersLeft: 1,
      tavernDeck: [numberCard('hearts', 2)], // recarga insuficiente
    });
    jesterSolo(state);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.phase).toBe('game_over');
    expect(state.jestersLeft).toBe(0);
  });
});

describe('victoryLevel [R-23]', () => {
  it('oro, plata y bronce según Jesters usados', () => {
    expect(victoryLevel(makeState({ jestersUsed: 0 }))).toBe('gold');
    expect(victoryLevel(makeState({ jestersUsed: 1 }))).toBe('silver');
    expect(victoryLevel(makeState({ jestersUsed: 2 }))).toBe('bronze');
  });
});

describe('playJester [R-20][R-21]', () => {
  function jesterState(suit: 'spades' | 'clubs' = 'spades') {
    const enemy = createEnemy(enemyCard(suit, 'J'));
    return makeState({
      enemy,
      players: [
        makePlayer('p0', { hand: [jesterCard()] }),
        makePlayer('p1', { hand: [numberCard('hearts', 4)] }),
      ],
    });
  }

  it('niega la inmunidad, no hace daño y elige quién va después', () => {
    const state = jesterState('clubs');
    playJester(state, 1);
    expect(state.enemy.immunityNegated).toBe(true);
    expect(state.enemy.damageTaken).toBe(0);
    expect(state.phase).toBe('choose_action');
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnNumber).toBe(2);
  });

  it('el Jester queda en la mesa hasta derrotar al enemigo [R-18](ii)', () => {
    const state = jesterState();
    playJester(state, 1);
    expect(state.table).toHaveLength(1);
    expect(state.table[0]!.card.kind).toBe('jester');
  });

  it('rechaza sin Jester en la mano, en solo y fuera del paso 1', () => {
    const sinJester = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] }), makePlayer('p1')],
    });
    expect(() => playJester(sinJester, 1)).toThrow();

    const solo = makeState({ players: [makePlayer('p0', { hand: [jesterCard()] })] });
    expect(() => playJester(solo, 0)).toThrow();

    const sufriendo = makeState({
      phase: 'suffer_damage',
      players: [makePlayer('p0', { hand: [jesterCard()] }), makePlayer('p1')],
    });
    expect(() => playJester(sufriendo, 1)).toThrow();
  });

  it('rechaza índice de jugador inválido y elegirse a sí mismo', () => {
    const state = jesterState();
    expect(() => playJester(state, 5)).toThrow();
    expect(() => playJester(state, 0)).toThrow();
  });

  it('enemigo de ♠: las picas previas en la mesa reducen el ataque retroactivamente [R-21]', () => {
    const state = jesterState('spades');
    state.table = [
      { playerId: 'p0', card: numberCard('spades', 3) },
      { playerId: 'p0', card: numberCard('spades', 4) },
    ];
    playJester(state, 1);
    expect(state.enemy.spadeShield).toBe(7);
    expect(state.enemy.damageTaken).toBe(0);
  });

  it('enemigo de ♣: no aplica escudo retroactivo [R-21]', () => {
    const state = jesterState('clubs');
    state.table = [{ playerId: 'p0', card: numberCard('spades', 5) }];
    playJester(state, 1);
    expect(state.enemy.spadeShield).toBe(0);
  });

  it('un segundo Jester no vuelve a sumar las picas previas', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    const state = makeState({
      enemy,
      players: [makePlayer('p0', { hand: [jesterCard('jester-0')] }), makePlayer('p1', { hand: [] })],
      table: [{ playerId: 'p0', card: numberCard('spades', 3) }],
    });
    state.enemy.immunityNegated = true;
    state.enemy.spadeShield = 3;
    playJester(state, 1);
    expect(state.enemy.spadeShield).toBe(3);
  });

  it('rompe la cadena de rendiciones al jugar una carta [R-9]', () => {
    const state = makeState({
      players: [makePlayer('p0', { hand: [jesterCard()] }), makePlayer('p1', { hand: [] })],
      consecutiveYields: 1,
    });
    playJester(state, 1);
    expect(state.consecutiveYields).toBe(0);
  });
});

describe('isStuck [R-25]', () => {
  it('atascado con mano vacía y sin Jester, en solo y en multijugador', () => {
    const solo = makeState({
      jestersLeft: 0,
      players: [makePlayer('p0', { hand: [] })],
    });
    expect(isStuck(solo)).toBe(true);

    const multi = makeState({
      players: [makePlayer('p0', { hand: [] }), makePlayer('p1')],
    });
    expect(isStuck(multi)).toBe(true);
  });

  it('no atascado si la mano no está vacía', () => {
    const conCartas = makeState({
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] }), makePlayer('p1')],
      consecutiveYields: 1,
    });
    expect(isStuck(conCartas)).toBe(false);
  });

  it('en solo con Jester disponible no está atascado (puede recargar [R-22])', () => {
    const state = makeState({
      jestersLeft: 1,
      players: [makePlayer('p0', { hand: [] })],
    });
    expect(isStuck(state)).toBe(false);
  });

  it('no atascado si el ataque efectivo es 0 (rendirse es seguro, R-19)', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.spadeShield = 10; // ataque efectivo 0
    const solo = makeState({
      enemy,
      jestersLeft: 0,
      players: [makePlayer('p0', { hand: [] })],
    });
    expect(isStuck(solo)).toBe(false);

    const multi = makeState({
      enemy,
      players: [makePlayer('p0', { hand: [] }), makePlayer('p1')],
    });
    expect(isStuck(multi)).toBe(false);
  });

  it('el turno que pasa a un jugador atascado dispara la derrota', () => {
    const state = makeState({
      phase: 'suffer_damage',
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      players: [
        makePlayer('p0', { hand: [enemyCard('hearts', 'K')] }), // valor 20 [R-24]
        makePlayer('p1', { hand: [] }),
      ],
      consecutiveYields: 1,
    });
    discardToSurvive(state, [id(enemyCard('hearts', 'K'))]);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('derrota automática si al revelar el siguiente enemigo la mano quedó vacía sin Jester [R-18](iv)', () => {
    const enemy = createEnemy(enemyCard('spades', 'J'));
    enemy.damageTaken = 15;
    const state = makeState({
      enemy,
      castleDeck: [enemyCard('hearts', 'J')], // siguiente enemigo
      jestersLeft: 0,
      players: [makePlayer('p0', { hand: [enemyCard('hearts', 'K')] })], // valor 20 [R-24]
    });
    const result = playCards(state, [id(enemyCard('hearts', 'K'))]);
    expect(result.enemyDefeated).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.phase).toBe('game_over');
  });

  it('el refill del Jester con taverna vacía deja la mano vacía y dispara la derrota [R-22][R-25]', () => {
    const state = makeState({
      enemy: createEnemy(enemyCard('spades', 'J')), // ataque 10
      jestersLeft: 1,
      tavernDeck: [],
      players: [makePlayer('p0', { hand: [numberCard('hearts', 4)] })],
    });
    jesterSolo(state);
    expect(state.gameOver).toBe(true);
    expect(state.result).toBe('defeat');
    expect(state.jestersLeft).toBe(0);
  });
});
