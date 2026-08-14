import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import type { OnlineSessionResult } from '../hooks/useOnlineGame';

interface RoomScreenProps extends ScreenProps {
  online: OnlineSessionResult;
}

export function RoomScreen({ online, onNavigate }: RoomScreenProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const room = online.room;

  if (!room) {
    const nameReady = name.trim().length > 0;
    const codeReady = code.trim().length === 5;
    return (
      <div className="screen">
        <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          Jugar online
        </h1>
        <p className="subtitle">Creá una sala o unite por código</p>
        {!online.connected && <p className="muted">Conectando al servidor…</p>}

        <div className="form">
          <label>Tu nombre</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ana"
            maxLength={20}
          />
        </div>

        <div className="form">
          <label>Código de sala</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC12"
            maxLength={5}
          />
          <div className="form-actions">
            <button
              type="button"
              className="menu-button"
              disabled={!online.connected || !nameReady}
              onClick={() => online.createRoom(name)}
            >
              Crear sala
            </button>
            <button
              type="button"
              className="menu-button"
              disabled={!online.connected || !nameReady || !codeReady}
              onClick={() => online.joinRoom(code, name)}
            >
              Unirse
            </button>
          </div>
        </div>

        {online.error && <div className="error-banner">{online.error}</div>}

        <button type="button" className="back-button" onClick={() => onNavigate('home')}>
          ← Volver al menú
        </button>
      </div>
    );
  }

  const isHost = room.hostId === online.myPlayerId;
  const canStart =
    isHost &&
    !room.started &&
    room.players.length >= 2 &&
    room.players.every((player) => player.connected);

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        Sala {room.code}
      </h1>
      <p className="subtitle">{room.started ? 'Partida en curso' : 'Esperando jugadores…'}</p>

      <ul className="lobby-list">
        {room.players.map((player) => (
          <li key={player.id}>
            <span>
              {player.name}
              {player.id === room.hostId && ' 👑'}
              {player.id === online.myPlayerId && ' (vos)'}
            </span>
            <span className={player.connected ? 'conn conn-on' : 'conn conn-off'}>
              {player.connected ? 'conectado' : 'desconectado'}
            </span>
          </li>
        ))}
      </ul>

      <p className="muted">
        {room.players.length}/{room.maxPlayers} jugadores · se necesitan al menos 2
      </p>

      {isHost && (
        <button type="button" className="menu-button" disabled={!canStart} onClick={online.startGame}>
          Empezar partida
        </button>
      )}
      {!isHost && !room.started && <p className="muted">El host iniciará la partida</p>}

      {online.error && <div className="error-banner">{online.error}</div>}

      <button
        type="button"
        className="back-button"
        onClick={() => {
          online.leaveRoom();
          onNavigate('home');
        }}
      >
        ← Salir de la sala
      </button>
    </div>
  );
}
