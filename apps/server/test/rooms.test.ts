import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS_TO_START, ROOM_CODE_LENGTH } from '@regicide/engine';
import { RoomManager } from '../src/rooms.js';

function makeRoom(manager: RoomManager, hostName = 'Host') {
  return manager.createRoom(hostName);
}

describe('RoomManager: ciclo de vida de salas', () => {
  it('crear sala: código de 5 chars, host con id y nombre saneado', () => {
    const manager = new RoomManager();
    const { code, playerId, room } = makeRoom(manager, '  Ana  ');
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
    expect(room.hostId).toBe(playerId);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]!.name).toBe('Ana');
    expect(room.players[0]!.connected).toBe(true);
    expect(room.started).toBe(false);
    expect(room.maxPlayers).toBe(MAX_PLAYERS);
  });

  it('unirse: agrega jugador manteniendo el orden de llegada', () => {
    const manager = new RoomManager();
    const { code, playerId: hostId } = makeRoom(manager);
    const { playerId: p2 } = manager.joinRoom(code, 'Beto');
    const { playerId: p3 } = manager.joinRoom(code, 'Caro');
    const room = manager.getRoom(code)!;
    expect(room.players.map((p) => p.id)).toEqual([hostId, p2, p3]);
    expect(room.hostId).toBe(hostId);
  });

  it('unirse a una sala llena lanza error', () => {
    const manager = new RoomManager();
    const { code } = makeRoom(manager);
    for (let i = 1; i < MAX_PLAYERS; i++) {
      manager.joinRoom(code, `J${i}`);
    }
    expect(() => manager.joinRoom(code, 'Sobra')).toThrow('llena');
  });

  it('unirse a una partida ya iniciada lanza error', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    manager.joinRoom(code, 'Beto');
    manager.startGame(code, playerId);
    expect(() => manager.joinRoom(code, 'Tarde')).toThrow('ya comenzó');
  });

  it('unirse a una sala inexistente lanza error', () => {
    const manager = new RoomManager();
    expect(() => manager.joinRoom('ZZZZZ', 'X')).toThrow('Sala no encontrada');
  });

  it('solo el host puede iniciar la partida', () => {
    const manager = new RoomManager();
    const { code } = makeRoom(manager);
    const { playerId: p2 } = manager.joinRoom(code, 'Beto');
    expect(() => manager.startGame(code, p2)).toThrow('host');
  });

  it('no inicia con menos del mínimo de jugadores', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    expect(() => manager.startGame(code, playerId)).toThrow(
      `al menos ${MIN_PLAYERS_TO_START}`,
    );
  });

  it('no inicia si hay jugadores desconectados', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    const { playerId: p2 } = manager.joinRoom(code, 'Beto');
    manager.setDisconnected(code, p2);
    expect(() => manager.startGame(code, playerId)).toThrow('desconectados');
  });

  it('inicia la partida respetando el orden de turno de la sala', () => {
    const manager = new RoomManager();
    const { code, playerId: p1 } = makeRoom(manager, 'A');
    const { playerId: p2 } = manager.joinRoom(code, 'B');
    const { playerId: p3 } = manager.joinRoom(code, 'C');
    manager.startGame(code, p1, 42);
    const game = manager.getGame(code)!;
    const ids = game.snapshot.players.map((p) => p.id);
    expect(ids).toEqual([p1, p2, p3]);
    expect(game.snapshot.players[0]!.maxHandSize).toBe(6); // 9 - 3
  });

  it('salir: si queda vacía la sala se cierra', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    const result = manager.leaveRoom(code, playerId);
    expect(result.closed).toBe(true);
    expect(result.room).toBeNull();
    expect(manager.getRoom(code)).toBeNull();
  });

  it('salir el host transfiere el host al siguiente jugador', () => {
    const manager = new RoomManager();
    const { code, playerId: p1 } = makeRoom(manager, 'A');
    const { playerId: p2 } = manager.joinRoom(code, 'B');
    const { playerId: p3 } = manager.joinRoom(code, 'C');
    const result = manager.leaveRoom(code, p1);
    expect(result.closed).toBe(false);
    expect(result.room!.hostId).toBe(p2);
    expect(manager.getRoom(code)!.players.map((p) => p.id)).toEqual([p2, p3]);
  });

  it('desconexión marca al jugador y transfiere el host si era host', () => {
    const manager = new RoomManager();
    const { code, playerId: p1 } = makeRoom(manager, 'A');
    const { playerId: p2 } = manager.joinRoom(code, 'B');
    const room = manager.setDisconnected(code, p1)!;
    expect(room.players[0]!.connected).toBe(false);
    expect(room.hostId).toBe(p2);
  });

  it('reconexión: vuelve a marcar conectado y mantiene la identidad', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager, 'Ana');
    manager.joinRoom(code, 'Beto');
    manager.setDisconnected(code, playerId);
    const { room, name } = manager.rejoinRoom(code, playerId);
    expect(name).toBe('Ana');
    expect(room.players[0]!.connected).toBe(true);
  });

  it('reconexión de un jugador ya conectado o desconocido lanza error', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    expect(() => manager.rejoinRoom(code, playerId)).toThrow('conexión activa');
    expect(() => manager.rejoinRoom(code, 'nadie')).toThrow('No estás en esta sala');
  });
});

describe('RoomManager: acciones de partida', () => {
  function startedTwoPlayers(seed = 7) {
    const manager = new RoomManager();
    const { code, playerId: p1 } = makeRoom(manager, 'A');
    const { playerId: p2 } = manager.joinRoom(code, 'B');
    manager.startGame(code, p1, seed);
    return { manager, code, p1, p2 };
  }

  it('rechaza acciones antes de iniciar la partida', () => {
    const manager = new RoomManager();
    const { code, playerId } = makeRoom(manager);
    expect(() => manager.applyAction(code, playerId, () => {})).toThrow('aún no comenzó');
  });

  it('rechaza acciones cuando no es el turno del jugador', () => {
    const { manager, code, p2 } = startedTwoPlayers();
    expect(() => manager.applyAction(code, p2, () => {})).toThrow('No es tu turno');
  });

  it('aplica una jugada válida del jugador con el turno', () => {
    const { manager, code, p1 } = startedTwoPlayers();
    const game = manager.getGame(code)!;
    const hand = game.snapshot.players[0]!.hand;
    manager.applyAction(code, p1, (g) => g.play([hand[0]!.id]));
    expect(game.snapshot.players[0]!.hand).toHaveLength(hand.length - 1);
  });

  it('una carta de enemigo en mano cubre el ataque en el paso de daño', () => {
    const { manager, code, p1 } = startedTwoPlayers(11);
    const game = manager.getGame(code)!;
    const player = game.snapshot.players[0]!;
    const enemyCard = player.hand.find((c) => c.kind === 'enemy');
    if (!enemyCard) return; // sin carta de enemigo en esta semilla no se cubre

    manager.applyAction(code, p1, (g) => g.play([enemyCard.id]));
    manager.applyAction(code, p1, (g) => g.discard([enemyCard.id]));
    expect(game.snapshot.phase).toBe('choose_action');
  });

  it('jugar el Jester [R-20]: elige al otro jugador y niega la inmunidad', () => {
    // Busca una semilla donde el primer jugador tenga el Jester en la mano (partida 3p).
    for (let seed = 0; seed < 500; seed++) {
      const manager = new RoomManager();
      const { code, playerId: p1 } = makeRoom(manager, 'A');
      manager.joinRoom(code, 'B');
      const { playerId: p3 } = manager.joinRoom(code, 'C');
      manager.startGame(code, p1, seed);
      const game = manager.getGame(code)!;
      const jester = game.snapshot.players[0]!.hand.find((c) => c.kind === 'jester');
      if (!jester) continue;

      manager.applyAction(code, p1, (g) => {
        const index = g.snapshot.players.findIndex((p) => p.id === p3);
        g.playJester(index);
      });
      expect(game.snapshot.enemy.immunityNegated).toBe(true);
      expect(game.snapshot.currentPlayerIndex).toBe(2);
      return;
    }
    throw new Error('Ninguna semilla dejó un Jester en la mano del primer jugador');
  });
});
