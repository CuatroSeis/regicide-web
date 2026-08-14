import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as createClient, type Socket } from 'socket.io-client';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  GameAck,
  PlayerGameState,
  RoomAck,
  ServerToClientEvents,
} from '@regicide/engine';
import { startServer } from '../src/index.js';

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function connect(url: string): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, { transports: ['websocket'], forceNew: true });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function waitFor<T>(socket: TestSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve as never));
}

function ack<R>(resolve: (value: R) => void): (result: R) => void {
  return resolve;
}

describe('server socket.io (E2E)', () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    server = startServer(0);
    await new Promise<void>((resolve) => server.httpServer.once('listening', () => resolve()));
    const port = (server.httpServer.address() as AddressInfo).port;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('dos jugadores crean una sala, inician y rotan el turno', async () => {
    const a = await connect(url);
    const b = await connect(url);

    try {
      // A crea la sala.
      const roomAck = (await new Promise<RoomAck>((resolve) =>
        a.emit('room:create', { name: 'Ana' }, ack(resolve)),
      )) as Extract<RoomAck, { ok: true }>;
      expect(roomAck.ok).toBe(true);
      const code = roomAck.code;

      // B se une.
      const roomAckB = (await new Promise<RoomAck>((resolve) =>
        b.emit('room:join', { code, name: 'Beto' }, ack(resolve)),
      )) as Extract<RoomAck, { ok: true }>;
      expect(roomAckB.ok).toBe(true);

      // B (no host) no puede iniciar.
      const denied = (await new Promise<GameAck>((resolve) =>
        b.emit('game:start', ack(resolve)),
      )) as Extract<GameAck, { ok: false }>;
      expect(denied.ok).toBe(false);

      // A inicia la partida.
      const stateA = waitFor<PlayerGameState>(a, 'game:state-sync');
      const stateB = waitFor<PlayerGameState>(b, 'game:state-sync');
      const startAck = (await new Promise<GameAck>((resolve) =>
        a.emit('game:start', ack(resolve)),
      )) as Extract<GameAck, { ok: true }>;
      expect(startAck.ok).toBe(true);

      const [snapA, snapB] = await Promise.all([stateA, stateB]);
      expect(snapA.playerId).toBe(roomAck.playerId);
      expect(snapB.playerId).toBe(roomAckB.playerId);
      expect(snapA.isMyTurn).toBe(true);
      expect(snapB.isMyTurn).toBe(false);
      expect(snapA.hand.length).toBeGreaterThan(0);

      // A juega la primera carta de su mano.
      const playedId = snapA.hand[0]!.id;
      const syncA2 = waitFor<PlayerGameState>(a, 'game:state-sync');
      const syncB2 = waitFor<PlayerGameState>(b, 'game:state-sync');
      const playAck = (await new Promise<GameAck>((resolve) =>
        a.emit('game:play', { cardIds: [playedId] }, resolve),
      )) as Extract<GameAck, { ok: true }>;
      expect(playAck.ok).toBe(true);
      const [snapA2, snapB2] = await Promise.all([syncA2, syncB2]);
      // La carta jugada sale de la mano y pasa a la mesa (los poderes de palo
      // como ♦ [R-12] pueden robar cartas, así que no se asume tamaño -1).
      expect(snapA2.hand.some((card) => card.id === playedId)).toBe(false);
      expect(snapA2.table).toHaveLength(1);
      expect(snapB2.table).toEqual(snapA2.table);

      // Quien no tiene el turno no puede jugar.
      const bDenied = (await new Promise<GameAck>((resolve) =>
        b.emit('game:play', { cardIds: [snapB.hand[0]!.id] }, ack(resolve)),
      )) as Extract<GameAck, { ok: false }>;
      expect(bDenied.ok).toBe(false);

      // La sala no permite más uniones una vez iniciada.
      const c = await connect(url);
      const lateJoin = (await new Promise<RoomAck>((resolve) =>
        c.emit('room:join', { code, name: 'Tarde' }, ack(resolve)),
      )) as Extract<RoomAck, { ok: false }>;
      expect(lateJoin.ok).toBe(false);
      c.disconnect();
    } finally {
      a.disconnect();
      b.disconnect();
    }
  });
});
