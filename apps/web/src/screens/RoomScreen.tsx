import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import type { OnlineSessionResult } from '../hooks/useOnlineGame';
import { useAuth, displayName } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface RoomScreenProps extends ScreenProps {
  online: OnlineSessionResult;
}

export function RoomScreen({ online, onNavigate }: RoomScreenProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const name = displayName(user);
  const [code, setCode] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const room = online.room;

  if (!room) {
    const codeReady = code.trim().length === 5;
    return (
      <div className="screen">
        <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          {t('onlineTitle')}
        </h1>
        <p className="subtitle">{t('onlineSubtitle')}</p>
        {!online.connected && <p className="muted">{t('connecting')}</p>}

        <p className="muted" style={{ marginBottom: '1rem' }}>
          {t('authLoggedAs', { name })}
        </p>

        <div className="form">
          <label htmlFor="room-code-input">{t('roomCode')}</label>
          <input
            id="room-code-input"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC12"
            maxLength={5}
          />
          <div className="form-actions">
            <button
              type="button"
              className="menu-button"
              disabled={!online.connected}
              onClick={() => online.createRoom(name)}
            >
              {t('createRoom')}
            </button>
            <button
              type="button"
              className="menu-button"
              disabled={!online.connected || !codeReady}
              onClick={() => online.joinRoom(code, name)}
            >
              {t('joinRoom')}
            </button>
          </div>
        </div>

        {online.error && <div className="error-banner">{online.error}</div>}

        <button type="button" className="back-button" onClick={() => onNavigate('home')}>
          {t('backToMenu')}
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
      {confirmLeave && (
        <ConfirmDialog
          title={t('confirmLeaveTitle')}
          body={t('confirmLeaveBody')}
          confirmLabel={t('confirmLeaveYes')}
          cancelLabel={t('confirmLeaveNo')}
          onConfirm={() => { online.leaveRoom(); onNavigate('home'); }}
          onCancel={() => setConfirmLeave(false)}
        />
      )}

      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        {t('roomCodeX', { code: room.code })}
      </h1>
      <p className="subtitle">{room.started ? t('gameInProgress') : t('waitingPlayers')}</p>

      <ul className="lobby-list">
        {room.players.map((player) => (
          <li key={player.id}>
            <span>
              {player.name}
              {player.id === room.hostId && ' 👑'}
              {player.id === online.myPlayerId && ` ${t('you')}`}
            </span>
            <span className={player.connected ? 'conn conn-on' : 'conn conn-off'}>
              {player.connected ? t('connected') : t('disconnected')}
            </span>
          </li>
        ))}
      </ul>

      <p className="muted">
        {t('playersCount', { n: room.players.length, max: room.maxPlayers })}
      </p>

      {isHost && (
        <button type="button" className="menu-button" disabled={!canStart} onClick={online.startGame}>
          {t('startGame')}
        </button>
      )}
      {!isHost && !room.started && <p className="muted">{t('hostWillStart')}</p>}

      {online.error && <div className="error-banner">{online.error}</div>}

      <button
        type="button"
        className="back-button"
        onClick={() => setConfirmLeave(true)}
      >
        {t('leaveRoom')}
      </button>
    </div>
  );
}
