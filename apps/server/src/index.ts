import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { playerSnapshot } from '@regicide/engine';
import type { ClientToServerEvents, ServerToClientEvents } from '@regicide/engine';
import { RoomManager } from './rooms.js';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

interface SocketData {
  roomCode?: string;
  playerId?: string;
}

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

/** playerId → socketId, para reenviar el estado individual de cada jugador. */
const socketByPlayerId = new Map<string, string>();

export function createGameServer(): GameServer {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      cors: {
        origin: CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
      },
    },
  );
  const roomManager = new RoomManager();

  io.on('connection', (socket) => {
    socket.on('room:create', (payload, ack) => {
      try {
        const result = roomManager.createRoom(payload.name);
        bind(socket, io, roomManager, result.code, result.playerId);
        socket.join(channel(result.code));
        io.to(channel(result.code)).emit('room:updated', result.room);
        ack({ ok: true, ...result, playerName: result.room.players[0]!.name });
      } catch (err) {
        ack({ ok: false, error: message(err) });
      }
    });

    socket.on('room:join', (payload, ack) => {
      try {
        const result = roomManager.joinRoom(payload.code, payload.name);
        bind(socket, io, roomManager, result.code, result.playerId);
        socket.join(channel(result.code));
        io.to(channel(result.code)).emit('room:updated', result.room);
        ack({ ok: true, ...result, playerName: playerName(roomManager, result.code, result.playerId) });
      } catch (err) {
        ack({ ok: false, error: message(err) });
      }
    });

    socket.on('room:rejoin', (payload, ack) => {
      try {
        // Si el jugador aún tiene un socket activo (recarga rápida), se
        // reemplaza: el socket viejo se desconecta y el nuevo toma la sesión.
        const existing = roomManager.getRoom(payload.code)?.players.find(
          (player) => player.id === payload.playerId,
        );
        if (existing?.connected) {
          const oldSocketId = socketByPlayerId.get(payload.playerId);
          if (oldSocketId && oldSocketId !== socket.id) {
            io.sockets.sockets.get(oldSocketId)?.disconnect(true);
          }
        }
        const { room, name } = roomManager.rejoinRoom(payload.code, payload.playerId);
        bind(socket, io, roomManager, payload.code, payload.playerId);
        socket.join(channel(payload.code));
        io.to(channel(payload.code)).emit('room:updated', room);
        if (room.started) {
          syncPlayer(io, roomManager, payload.code, payload.playerId);
        }
        ack({ ok: true, code: room.code, playerId: payload.playerId, playerName: name, room });
      } catch (err) {
        ack({ ok: false, error: message(err) });
      }
    });

    socket.on('room:leave', (ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        unbind(socket, roomCode, playerId);
        const result = roomManager.leaveRoom(roomCode, playerId);
        if (result.closed) {
          io.to(channel(roomCode)).emit('room:closed', 'La sala se cerró');
        } else if (result.room) {
          io.to(channel(roomCode)).emit('room:updated', result.room);
        }
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('game:start', (ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        const room = roomManager.startGame(roomCode, playerId);
        io.to(channel(roomCode)).emit('room:updated', room);
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('game:play', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.play(payload.cardIds));
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('game:yield', (ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.yield());
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('game:discard', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.discard(payload.cardIds));
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('game:play-jester', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => {
          const index = game.snapshot.players.findIndex((p) => p.id === payload.nextPlayerId);
          if (index === -1) {
            throw new Error('Jugador destino desconocido');
          }
          game.playJester(index);
        });
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err) });
      }
    });

    socket.on('disconnect', () => {
      const { roomCode, playerId } = socket.data;
      if (!roomCode || !playerId) return;
      // Si otro socket ya tomó este playerId (rejoin), no marcar desconectado.
      if (socketByPlayerId.get(playerId) !== socket.id) {
        socket.data = {};
        return;
      }
      unbind(socket, roomCode, playerId);
      const room = roomManager.setDisconnected(roomCode, playerId);
      if (room) {
        io.to(channel(roomCode)).emit('room:updated', room);
      }
    });
  });

  return io;
}

function bind(
  socket: GameSocket,
  io: GameServer,
  roomManager: RoomManager,
  code: string,
  playerId: string,
): void {
  const { roomCode: oldCode } = socket.data;
  if (oldCode && oldCode !== code) {
    socket.leave(channel(oldCode));
  }
  const previousSocketId = socketByPlayerId.get(playerId);
  if (previousSocketId && previousSocketId !== socket.id) {
    io.sockets.sockets.get(previousSocketId)?.leave(channel(code));
  }
  socketByPlayerId.set(playerId, socket.id);
  socket.data = { roomCode: code, playerId };
}

function unbind(socket: GameSocket, code: string, playerId: string): void {
  socketByPlayerId.delete(playerId);
  socket.leave(channel(code));
  socket.data = {};
}

function syncRoom(io: GameServer, roomManager: RoomManager, code: string): void {
  for (const playerId of roomManager.getPlayerOrder(code)) {
    syncPlayer(io, roomManager, code, playerId);
  }
}

function syncPlayer(io: GameServer, roomManager: RoomManager, code: string, playerId: string): void {
  const game = roomManager.getGame(code);
  const socketId = socketByPlayerId.get(playerId);
  if (!game || !socketId) return;
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;
  socket.emit('game:state-sync', playerSnapshot(game.snapshot, playerId));
}

function requireBinding(socket: GameSocket): { roomCode: string; playerId: string } {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) {
    throw new Error('No estás en una sala');
  }
  return { roomCode, playerId };
}

function playerName(manager: RoomManager, code: string, playerId: string): string {
  return manager.getRoom(code)?.players.find((p) => p.id === playerId)?.name ?? 'Jugador';
}

function channel(code: string): string {
  return `room:${code}`;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Error inesperado';
}

export function startServer(port = PORT): GameServer {
  const io = createGameServer();
  io.listen(port);
  console.log(`Regicide server escuchando en http://localhost:${port}`);
  return io;
}
