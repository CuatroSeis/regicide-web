import { randomUUID } from 'node:crypto';
import { Game, GameError } from '@regicide/engine';

/** Datos internos de un jugador dentro de una sala. */
export interface InternalPlayer {
  id: string;
  name: string;
  connected: boolean;
}

/** Sala interna (estado del servidor). */
export interface InternalRoom {
  code: string;
  players: InternalPlayer[];
  hostId: string;
  playerOrder: string[];
  started: boolean;
  maxPlayers: number;
  createdAt: number;
  game?: Game;
}

/** Resultado de crear/unirse a una sala (lo que se envía al cliente). */
export interface RoomResult {
  code: string;
  playerId: string;
  room: RoomPublicInfo;
}

/** Info pública de la sala para el cliente. */
export interface RoomPublicInfo {
  code: string;
  players: { id: string; name: string; connected: boolean }[];
  hostId: string;
  started: boolean;
  maxPlayers: number;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class RoomManager {
  private readonly rooms = new Map<string, InternalRoom>();
  private static readonly MAX_ROOMS = 200;
  private static readonly IDLE_TTL = 30 * 60 * 1000; // 30 min
  private static readonly GAME_TTL = 2 * 60 * 60 * 1000; // 2h

  /** Limpia salas expiradas (llamar periódicamente). */
  cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const ttl = room.started ? RoomManager.GAME_TTL : RoomManager.IDLE_TTL;
      if (now - room.createdAt > ttl) {
        this.rooms.delete(code);
      }
    }
  }

  /** Crea una sala con el jugador como host. */
  createRoom(name: string, userId?: string): RoomResult {
    this.cleanup();
    if (this.rooms.size >= RoomManager.MAX_ROOMS) {
      throw new GameError('too_many_rooms', 'Demasiadas salas activas. Intentá más tarde.');
    }
    const code = this.findFreeCode();
    const playerId = userId ?? randomUUID();
    const player: InternalPlayer = { id: playerId, name: truncateName(name), connected: true };
    const room: InternalRoom = {
      code,
      players: [player],
      hostId: playerId,
      playerOrder: [playerId],
      started: false,
      maxPlayers: 4,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return { code, playerId, room: this.toPublic(room) };
  }

  /** Une un jugador a una sala existente. */
  joinRoom(code: string, name: string, userId?: string): RoomResult {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new GameError('room_not_found', 'Sala no encontrada');
    if (room.started) throw new GameError('room_already_started', 'La partida ya comenzó');
    if (room.players.length >= room.maxPlayers) throw new GameError('room_full', 'Sala llena');

    const playerId = userId ?? randomUUID();

    // Si el userId ya está en la sala (rejoin tras desconexión), re-conectar.
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      return { code: room.code, playerId, room: this.toPublic(room) };
    }

    const player: InternalPlayer = { id: playerId, name: truncateName(name), connected: true };
    room.players.push(player);
    room.playerOrder.push(playerId);
    return { code: room.code, playerId, room: this.toPublic(room) };
  }

  /** Re-une un jugador desconectado (por ID). */
  rejoinRoom(
    code: string,
    playerId: string,
    opts?: { force?: boolean },
  ): { room: RoomPublicInfo; name: string } {
    const room = this.rooms.get(code);
    if (!room) throw new GameError('room_not_found', 'Sala no encontrada');
    const player = room.players.find((p) => p.id === playerId);
    if (!player) throw new GameError('not_in_room', 'No estás en esta sala');

    if (!opts?.force && player.connected) {
      throw new GameError('active_connection', 'Ya tenés una conexión activa');
    }

    player.connected = true;
    return { room: this.toPublic(room), name: player.name };
  }

  /** Sale de la sala. Si queda vacía, la cierra. */
  leaveRoom(code: string, playerId: string): { room: RoomPublicInfo | null; closed: boolean } {
    const room = this.rooms.get(code);
    if (!room) return { room: null, closed: true };

    room.players = room.players.filter((p) => p.id !== playerId);
    room.playerOrder = room.playerOrder.filter((id) => id !== playerId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return { room: null, closed: true };
    }

    // Si el host se fue, transferir al siguiente conectado.
    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => p.connected);
      if (nextHost) room.hostId = nextHost.id;
    }

    return { room: this.toPublic(room), closed: false };
  }

  /** Marca un jugador como desconectado. */
  setDisconnected(code: string, playerId: string): RoomPublicInfo | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
    // Si el host se desconectó, transferir al siguiente conectado.
    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => p.connected);
      if (nextHost) room.hostId = nextHost.id;
    }
    return this.toPublic(room);
  }

  /** Inicia la partida (solo el host). */
  startGame(code: string, hostId: string, seed?: number): RoomPublicInfo {
    const room = this.rooms.get(code);
    if (!room) throw new GameError('room_not_found', 'Sala no encontrada');
    if (room.hostId !== hostId) throw new GameError('host_only', 'Solo el host puede iniciar');
    if (room.started) throw new GameError('room_already_started', 'La partida ya empezó');
    if (room.players.length < 2) throw new GameError('need_two_players', 'Se necesitan al menos 2 jugadores');
    if (!room.players.every((p) => p.connected)) throw new GameError('players_disconnected', 'Hay jugadores desconectados');

    room.started = true;
    room.game = new Game({ playerCount: room.playerOrder.length, seed, playerIds: room.playerOrder });
    return this.toPublic(room);
  }

  /** Aplica una acción del juego y valida que sea el turno del jugador. */
  applyAction(
    code: string,
    playerId: string,
    action: (game: Game) => void,
  ): void {
    const room = this.rooms.get(code);
    if (!room) throw new GameError('room_not_found', 'Sala no encontrada');
    if (!room.started) throw new GameError('room_not_started', 'La partida aún no comenzó');

    const game = room.game;
    if (!game) throw new GameError('game_not_initialized', 'Juego no inicializado');

    const snapshot = game.snapshot;
    const currentPlayer = snapshot.players[snapshot.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new GameError('not_your_turn', 'No es tu turno');
    }

    action(game);
  }

  /** Obtiene el juego de una sala. */
  getGame(code: string): Game | undefined {
    const room = this.rooms.get(code);
    return room?.game;
  }

  /** Obtiene el orden de jugadores de una sala. */
  getPlayerOrder(code: string): string[] {
    return this.rooms.get(code)?.playerOrder ?? [];
  }

  /** Obtiene la sala pública. */
  getRoom(code: string): RoomPublicInfo | null {
    const room = this.rooms.get(code);
    return room ? this.toPublic(room) : null;
  }

  private findFreeCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = generateCode();
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('No se pudo generar un código único');
  }

  private toPublic(room: InternalRoom): RoomPublicInfo {
    return {
      code: room.code,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
      })),
      hostId: room.hostId,
      started: room.started,
      maxPlayers: room.maxPlayers,
    };
  }
}

function truncateName(name: string): string {
  const trimmed = name.trim().slice(0, 20);
  return trimmed.length > 0 ? trimmed : 'Jugador';
}
