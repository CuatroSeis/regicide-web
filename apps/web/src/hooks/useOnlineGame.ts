import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { cardValue, effectiveAttack } from '@regicide/engine';
import type {
  ClientToServerEvents,
  PlayerGameState,
  RoomInfo,
  ServerToClientEvents,
} from '@regicide/engine';

const STORAGE_KEY = 'regicide.online.session';

interface StoredSession {
  code: string;
  playerId: string;
}

type OnlineSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface OnlineSessionResult {
  connected: boolean;
  error: string | null;
  room: RoomInfo | null;
  state: PlayerGameState | null;
  myPlayerId: string | null;
  selected: string[];
  selectionValue: number;
  canPlay: boolean;
  canDiscard: boolean;
  canPlayJester: boolean;
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  play: () => void;
  yieldTurn: () => void;
  discard: () => void;
  playJester: (nextPlayerId: string) => void;
  toggle: (cardId: string) => void;
  clearSelection: () => void;
}

/** Sesión online conectada al server vía Socket.io (un solo hook por app). */
export function useOnlineGame(): OnlineSessionResult {
  const socketRef = useRef<OnlineSocket | null>(null);
  if (socketRef.current === null) {
    socketRef.current = io();
  }
  const socket = socketRef.current;

  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [state, setState] = useState<PlayerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const sessionRef = useRef<StoredSession | null>(loadSession());
  const [myPlayerId, setMyPlayerId] = useState<string | null>(
    sessionRef.current?.playerId ?? null,
  );

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setError(null);
      const session = sessionRef.current;
      if (session) {
        socket.emit('room:rejoin', session, (ack) => {
          if (ack.ok) {
            sessionRef.current = { code: ack.code, playerId: ack.playerId };
            saveSession(sessionRef.current);
            setMyPlayerId(ack.playerId);
          } else {
            sessionRef.current = null;
            clearSession();
            setMyPlayerId(null);
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoomUpdated = (next: RoomInfo) => setRoom(next);
    const onStateSync = (snapshot: PlayerGameState) => setState(snapshot);
    const onRoomClosed = (reason: string) => {
      setRoom(null);
      setState(null);
      setError(reason);
      sessionRef.current = null;
      clearSession();
      setMyPlayerId(null);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:updated', onRoomUpdated);
    socket.on('game:state-sync', onStateSync);
    socket.on('room:closed', onRoomClosed);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:state-sync', onStateSync);
      socket.off('room:closed', onRoomClosed);
    };
  }, [socket]);

  useEffect(() => {
    setSelected([]);
  }, [state]);

  const createRoom = useCallback(
    (name: string) => {
      socket.emit('room:create', { name }, (ack) => {
        if (ack.ok) {
          sessionRef.current = { code: ack.code, playerId: ack.playerId };
          saveSession(sessionRef.current);
          setMyPlayerId(ack.playerId);
        } else {
          setError(ack.error);
        }
      });
    },
    [socket],
  );

  const joinRoom = useCallback(
    (code: string, name: string) => {
      socket.emit('room:join', { code, name }, (ack) => {
        if (ack.ok) {
          sessionRef.current = { code: ack.code, playerId: ack.playerId };
          saveSession(sessionRef.current);
          setMyPlayerId(ack.playerId);
        } else {
          setError(ack.error);
        }
      });
    },
    [socket],
  );

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave', (ack) => {
      if (ack.ok) {
        setRoom(null);
        setState(null);
        setSelected([]);
        sessionRef.current = null;
        clearSession();
        setMyPlayerId(null);
      } else if (ack.error) {
        setError(ack.error);
      }
    });
  }, [socket]);

  const startGame = useCallback(() => {
    socket.emit('game:start', (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }, [socket]);

  const play = useCallback(() => {
    socket.emit('game:play', { cardIds: selected }, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }, [socket, selected]);

  const yieldTurn = useCallback(() => {
    socket.emit('game:yield', (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }, [socket]);

  const discard = useCallback(() => {
    socket.emit('game:discard', { cardIds: selected }, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
  }, [socket, selected]);

  const playJester = useCallback(
    (nextPlayerId: string) => {
      socket.emit('game:play-jester', { nextPlayerId }, (ack) => {
        if (!ack.ok) setError(ack.error);
      });
    },
    [socket],
  );

  const toggle = useCallback((cardId: string) => {
    setSelected((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }, []);

  const clearSelection = useCallback(() => setSelected([]), []);

  const selectionValue = useMemo(() => {
    if (!state) return 0;
    const byId = new Map(state.hand.map((card) => [card.id, card]));
    return selected.reduce((acc, id) => acc + cardValue(byId.get(id)!), 0);
  }, [state, selected]);

  const canPlay = useMemo(
    () => Boolean(state && state.isMyTurn && state.phase === 'choose_action' && selected.length > 0),
    [state, selected],
  );

  const canDiscard = useMemo(
    () =>
      Boolean(
        state && state.isMyTurn && state.phase === 'suffer_damage' && selectionValue > 0 &&
          selectionValue >= effectiveAttack(state.enemy),
      ),
    [state, selectionValue],
  );

  const canPlayJester = useMemo(
    () =>
      Boolean(
        state &&
          state.isMyTurn &&
          state.phase === 'choose_action' &&
          state.players.length > 1 &&
          state.hand.some((card) => card.kind === 'jester'),
      ),
    [state],
  );

  return {
    connected,
    error,
    room,
    state,
    myPlayerId,
    selected,
    selectionValue,
    canPlay,
    canDiscard,
    canPlayJester,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    play,
    yieldTurn,
    discard,
    playJester,
    toggle,
    clearSelection,
  };
}
