import { randomUUID } from 'node:crypto';
import { Game, MAX_PLAYERS, MIN_PLAYERS_TO_START, ROOM_CODE_LENGTH } from '@regicide/engine';
import type { RoomInfo, RoomPlayerInfo } from '@regicide/engine';

/** Alfabeto sin caracteres confusos (0/O, 1/I/L) para códigos de sala. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface CreateRoomResult {
  readonly code: string;
  readonly playerId: string;
  readonly room: RoomInfo;
}

export interface LeaveRoomResult {
  readonly closed: boolean;
  readonly room: RoomInfo | null;
}

/** Versión mutable de `RoomPlayerInfo`: la conexión cambia en vida. */
type InternalPlayer = Omit<RoomPlayerInfo, 'connected'> & { connected: boolean };

interface InternalRoom {
  readonly code: string;
  readonly players: Map<string, InternalPlayer>;
  hostId: string;
  started: boolean;
  /** Orden de turno según llegada a la sala (indices del engine). */
  readonly playerOrder: string[];
  game: Game | null;
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return code;
}

function sanitizeName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 20) : 'Jugador';
}

function makeRoomInfo(room: InternalRoom): RoomInfo {
  return {
    code: room.code,
    players: [...room.players.values()],
    started: room.started,
    hostId: room.hostId,
    maxPlayers: MAX_PLAYERS,
  };
}

/**
 * Gestor de salas en memoria: creación, unión, salida, reconexión e inicio de
 * partida. No depende del transporte de Socket.io, así es testeable de forma
 * aislada. El host es el primer jugador; al irse, se transfiere al siguiente.
 */
export class RoomManager {
  private readonly rooms = new Map<string, InternalRoom>();

  createRoom(name: string): CreateRoomResult {
    const code = this.uniqueCode();
    const playerId = randomUUID();
    const player: InternalPlayer = { id: playerId, name: sanitizeName(name), connected: true };
    const room: InternalRoom = {
      code,
      players: new Map([[playerId, player]]),
      hostId: playerId,
      started: false,
      playerOrder: [playerId],
      game: null,
    };
    this.rooms.set(code, room);
    return { code, playerId, room: makeRoomInfo(room) };
  }

  joinRoom(code: string, name: string): CreateRoomResult {
    const room = this.requireRoom(code);
    if (room.started) {
      throw new Error('La partida ya comenzó en esta sala');
    }
    if (room.players.size >= MAX_PLAYERS) {
      throw new Error(`La sala está llena (máximo ${MAX_PLAYERS} jugadores)`);
    }
    const playerId = randomUUID();
    const player: InternalPlayer = { id: playerId, name: sanitizeName(name), connected: true };
    room.players.set(playerId, player);
    room.playerOrder.push(playerId);
    return { code, playerId, room: makeRoomInfo(room) };
  }

  /** Reconoce a un jugador ya registrado (p. ej. tras recargar la pestaña). */
  rejoinRoom(
    code: string,
    playerId: string,
    options?: { force?: boolean },
  ): { room: RoomInfo; name: string } {
    const room = this.requireRoom(code);
    const player = room.players.get(playerId);
    if (!player) {
      throw new Error('No estás en esta sala');
    }
    if (player.connected && !options?.force) {
      throw new Error('Ya hay una conexión activa con ese jugador');
    }
    player.connected = true;
    return { room: makeRoomInfo(room), name: player.name };
  }

  leaveRoom(code: string, playerId: string): LeaveRoomResult {
    const room = this.rooms.get(code);
    if (!room) return { closed: true, room: null };
    room.players.delete(playerId);
    const orderIndex = room.playerOrder.indexOf(playerId);
    if (orderIndex !== -1) room.playerOrder.splice(orderIndex, 1);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return { closed: true, room: null };
    }
    if (room.hostId === playerId) {
      room.hostId = this.firstConnectedId(room);
    }
    return { closed: false, room: makeRoomInfo(room) };
  }

  /** Marca a un jugador como desconectado sin expulsarlo de la sala. */
  setDisconnected(code: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
      if (room.hostId === playerId) {
        room.hostId = this.firstConnectedId(room);
      }
    }
    return makeRoomInfo(room);
  }

  startGame(code: string, hostId: string, seed?: number): RoomInfo {
    const room = this.requireRoom(code);
    if (room.started) {
      throw new Error('La partida ya comenzó');
    }
    if (room.hostId !== hostId) {
      throw new Error('Solo el host puede iniciar la partida');
    }
    if (room.players.size < MIN_PLAYERS_TO_START) {
      throw new Error(`Se necesitan al menos ${MIN_PLAYERS_TO_START} jugadores`);
    }
    if ([...room.players.values()].some((p) => !p.connected)) {
      throw new Error('Hay jugadores desconectados en la sala');
    }
    const gameSeed = seed ?? (Math.random() * 0xffffffff) >>> 0;
    room.game = new Game({ playerCount: room.players.size, seed: gameSeed, playerIds: room.playerOrder });
    room.started = true;
    return makeRoomInfo(room);
  }

  /**
   * Ejecuta una acción sobre la partida del remitente previa validación de
   * identidad: solo el jugador con el turno actual puede actuar. Las reglas
   * las valida el engine (sin duplicar lógica aquí).
   */
  applyAction(code: string, playerId: string, action: (game: Game) => void): void {
    const room = this.requireRoom(code);
    if (!room.started || !room.game) {
      throw new Error('La partida aún no comenzó');
    }
    const current = room.game.snapshot.players[room.game.snapshot.currentPlayerIndex]!;
    if (current.id !== playerId) {
      throw new Error('No es tu turno');
    }
    action(room.game);
  }

  getRoom(code: string): RoomInfo | null {
    const room = this.rooms.get(code.toUpperCase());
    return room ? makeRoomInfo(room) : null;
  }

  /** Instancia del engine para una sala iniciada; `null` si no existe o no empezó. */
  getGame(code: string): Game | null {
    const room = this.rooms.get(code);
    return room?.started && room.game ? room.game : null;
  }

  /** IDs de jugador en orden de turno (o `[]` si la sala no existe). */
  getPlayerOrder(code: string): string[] {
    const room = this.rooms.get(code);
    return room ? [...room.playerOrder] : [];
  }

  closeRoom(code: string): void {
    this.rooms.delete(code);
  }

  private requireRoom(code: string): InternalRoom {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error('Sala no encontrada');
    }
    return room;
  }

  private uniqueCode(): string {
    for (let attempts = 0; attempts < 100; attempts++) {
      const code = randomCode();
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('No se pudo generar un código de sala único');
  }

  private firstConnectedId(room: InternalRoom): string {
    for (const id of room.playerOrder) {
      if (room.players.get(id)?.connected) return id;
    }
    return room.playerOrder[0]!;
  }
}
