import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Server, type Socket } from 'socket.io';
import { playerSnapshot, GameError } from '@regicide/engine';
import type { GameErrorCode } from '@regicide/engine';
import type {
  ClientToServerEvents,
  PlayerGameState,
  ServerToClientEvents,
} from '@regicide/engine';
import { RoomManager } from './rooms.js';
import { createLeaderboardStore, parseScoreInput } from './leaderboard.js';
import type { LeaderboardStore, ScoreInput } from './leaderboard.js';
import { verifyToken, extractBearerToken, type AuthUser } from './auth.js';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
/** Build estático de la web (fallback al deploy de un solo origen). */
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? join(import.meta.dirname, '../../web/dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

interface SocketData {
  roomCode?: string;
  playerId?: string;
  authUser?: AuthUser;
}

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;

/** playerId → socketId, para reenviar el estado individual de cada jugador. */
const socketByPlayerId = new Map<string, string>();

/** Rate limiting simple: IP → timestamps de requests. */
const rateLimits = new Map<string, number[]>();
const RATE_WINDOW = 60_000;
const RATE_MAX_SCORES = 10;
const RATE_MAX_ROOMS = 5;

function checkRate(ip: string, max: number): boolean {
  const now = Date.now();
  const hits = rateLimits.get(ip) ?? [];
  const recent = hits.filter((t) => now - t < RATE_WINDOW);
  if (recent.length >= max) return false;
  recent.push(now);
  rateLimits.set(ip, recent);
  return true;
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function createGameServer(options?: { leaderboard?: LeaderboardStore }): GameServer {
  const httpServer = createServer((req, res) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(key, value);
    }
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname.startsWith('/socket.io/')) return;
    void handleApi(req, res, leaderboard).then((handled) => {
      if (!handled) void servePublicFile(pathname === '/' ? '/index.html' : pathname, res);
    });
  });
  const leaderboard = options?.leaderboard ?? createLeaderboardStore();
  void leaderboard.load();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      cors: {
        origin: CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
      },
      pingInterval: 30_000,
      pingTimeout: 10_000,
    },
  );
  const roomManager = new RoomManager();

  io.on('connection', async (socket) => {
    // Verificar JWT si se provee en el handshake.
    const token = (socket.handshake.auth as Record<string, unknown>)?.token;
    if (typeof token === 'string' && token.length > 0) {
      try {
        socket.data.authUser = await verifyToken(token);
      } catch {
        // Token inválido: permite conectar pero sin auth (solo spectate/rejoin
        // con playerId guardado en sessionStorage).
      }
    }

    socket.on('room:create', (payload, ack) => {
      try {
        const ip = socket.handshake.address;
        if (!checkRate(ip, RATE_MAX_ROOMS)) {
          ack({ ok: false, error: 'Demasiadas salas. Esperá un momento.', errorCode: 'too_many_rooms' });
          return;
        }
        const authUser = socket.data.authUser;
        const result = roomManager.createRoom(payload.name, authUser?.userId);
        bind(socket, io, roomManager, result.code, result.playerId);
        socket.join(channel(result.code));
        io.to(channel(result.code)).emit('room:updated', result.room);
        ack({ ok: true, ...result, playerName: result.room.players[0]!.name });
      } catch (err) {
        ack({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('room:join', (payload, ack) => {
      try {
        const authUser = socket.data.authUser;
        const result = roomManager.joinRoom(payload.code, payload.name, authUser?.userId);
        bind(socket, io, roomManager, result.code, result.playerId);
        socket.join(channel(result.code));
        io.to(channel(result.code)).emit('room:updated', result.room);
        ack({ ok: true, ...result, playerName: playerName(roomManager, result.code, result.playerId) });
      } catch (err) {
        ack({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('room:rejoin', (payload, ack) => {
      try {
        const existing = roomManager.getRoom(payload.code)?.players.find(
          (player) => player.id === payload.playerId,
        );
        const oldSocketId = socketByPlayerId.get(payload.playerId);
        const replacing = Boolean(existing?.connected && oldSocketId && oldSocketId !== socket.id);
        if (replacing && oldSocketId) {
          io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        }
        const { room, name } = roomManager.rejoinRoom(payload.code, payload.playerId, {
          force: replacing,
        });
        bind(socket, io, roomManager, payload.code, payload.playerId);
        socket.join(channel(payload.code));
        io.to(channel(payload.code)).emit('room:updated', room);
        if (room.started) {
          syncPlayer(io, roomManager, payload.code, payload.playerId);
        }
        ack({ ok: true, code: room.code, playerId: payload.playerId, playerName: name, room });
      } catch (err) {
        ack({ ok: false, error: message(err), errorCode: errorCode(err) });
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
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('game:start', (ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.startGame(roomCode, playerId);
        io.to(channel(roomCode)).emit('room:updated', roomManager.getRoom(roomCode)!);
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('game:play', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.play(payload.cardIds));
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('game:yield', (ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.yield());
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('game:discard', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => game.discard(payload.cardIds));
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('game:play-jester', (payload, ack) => {
      try {
        const { roomCode, playerId } = requireBinding(socket);
        roomManager.applyAction(roomCode, playerId, (game) => {
          const index = game.snapshot.players.findIndex((p) => p.id === payload.nextPlayerId);
          if (index === -1) {
            throw new GameError('unknown_target', 'Jugador destino desconocido');
          }
          game.playJester(index);
        });
        syncRoom(io, roomManager, roomCode);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: message(err), errorCode: errorCode(err) });
      }
    });

    socket.on('disconnect', () => {
      const { roomCode, playerId } = socket.data;
      if (!roomCode || !playerId) return;
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
  socket.data = { ...socket.data, roomCode: code, playerId };
}

function unbind(socket: GameSocket, code: string, playerId: string): void {
  socketByPlayerId.delete(playerId);
  socket.leave(channel(code));
  socket.data = { ...socket.data, roomCode: undefined, playerId: undefined };
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
  socket.emit('game:state-sync', withPlayerNames(roomManager, code, playerSnapshot(game.snapshot, playerId)));
}

function withPlayerNames(manager: RoomManager, code: string, snapshot: PlayerGameState): PlayerGameState {
  const names = new Map((manager.getRoom(code)?.players ?? []).map((p) => [p.id, p.name]));
  const log = snapshot.log.map((entry) => {
    if (!entry.args) return entry;
    const args = Object.fromEntries(
      Object.entries(entry.args).map(([k, v]) => [k, typeof v === 'string' ? names.get(v) ?? v : v]),
    );
    return { ...entry, args };
  });
  return { ...snapshot, log };
}

function requireBinding(socket: GameSocket): { roomCode: string; playerId: string } {
  const { roomCode, playerId } = socket.data;
  if (!roomCode || !playerId) {
    throw new GameError('not_in_room', 'No estás en una sala');
  }
  return { roomCode, playerId };
}

function playerName(manager: RoomManager, code: string, playerId: string): string {
  return manager.getRoom(code)?.players.find((p) => p.id === playerId)?.name ?? 'Jugador';
}

function channel(code: string): string {
  return `room:${code}`;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

/** API REST mínima para la tabla de posiciones (partidas 1p). */
async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  leaderboard: LeaderboardStore,
): Promise<boolean> {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (req.method === 'GET' && pathname === '/api/leaderboard') {
    try {
      const raw = Number(new URL(req.url ?? '/', 'http://localhost').searchParams.get('limit') ?? 50);
      const limit = Math.max(1, Math.min(Number.isFinite(raw) ? raw : 50, 50));
      sendJson(res, 200, { entries: await leaderboard.list(limit) });
    } catch (err) {
      sendJson(res, 500, { error: message(err) });
    }
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/scores') {
    const ip = req.socket.remoteAddress ?? 'unknown';
    if (!checkRate(ip, RATE_MAX_SCORES)) {
      sendJson(res, 429, { error: 'Demasiadas solicitudes. Esperá un momento.' });
      return true;
    }
    void readBody(req)
      .then(async (body) => {
        const raw = body as Record<string, unknown>;
        // Si se provee un token, verificar y usar el userId; si no, allow anonymous.
        const token = extractBearerToken(req.headers.authorization);
        if (token) {
          try {
            const authUser = await verifyToken(token);
            raw.userId = authUser.userId;
            if (!raw.name || (typeof raw.name === 'string' && raw.name.trim().length === 0)) {
              raw.name = authUser.displayName;
            }
          } catch {
            // Token inválido: permitir como anónimo.
            raw.userId = raw.userId ?? 'anonymous';
          }
        } else {
          raw.userId = raw.userId ?? 'anonymous';
        }
        const input: ScoreInput = parseScoreInput(raw);
        const entry = leaderboard.add(input);
        sendJson(res, 201, { entry });
      })
      .catch((err) => sendJson(res, 400, { error: message(err) }));
    return true;
  }
  return false;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
      if (data.length > 1_000_000) {
        req.destroy();
        reject(new Error('Body demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data.length > 0 ? JSON.parse(data) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

async function servePublicFile(pathname: string, res: ServerResponse): Promise<void> {
  const filePath = normalize(join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      res.writeHead(200, { 'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
      return;
    }
  } catch {
    // No existe el archivo: SPA fallback.
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(join(PUBLIC_DIR, 'index.html')).pipe(res);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Error inesperado';
}

/** Código estable del error para que el cliente lo traduzca (undefined si es genérico). */
function errorCode(err: unknown): GameErrorCode | undefined {
  return err instanceof GameError ? err.code : undefined;
}

export function startServer(port = PORT, options?: { leaderboard?: LeaderboardStore }): GameServer {
  const io = createGameServer(options);
  io.httpServer.listen(port, () => {
    console.log(`Regicide server escuchando en http://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Cerrando server...');
    io.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return io;
}
