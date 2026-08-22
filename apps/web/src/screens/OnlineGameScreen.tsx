import { useState } from 'react';
import { effectiveAttack } from '@regicide/engine';
import type { ScreenProps } from '../navigation';
import type { OnlineSessionResult } from '../hooks/useOnlineGame';
import type { BoardBanner } from '../components/GameBoard';
import { GameBoard } from '../components/GameBoard';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RivalsPanel } from '../components/RivalsPanel';
import { useLanguage } from '../i18n/LanguageContext';

interface OnlineGameScreenProps extends ScreenProps {
  online: OnlineSessionResult;
}

function localCanYield(consecutiveYields: number, playerCount: number): boolean {
  return playerCount === 1 || consecutiveYields < playerCount - 1;
}

/** Tablero multijugador: el estado viene del server (PlayerGameState), no local. */
export function OnlineGameScreen({ online, onNavigate }: OnlineGameScreenProps) {
  const { t } = useLanguage();
  const s = online.state;
  const [jesterPick, setJesterPick] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!s) {
    return (
      <div className="screen game-screen">
        <p className="muted">{t('waitingState')}</p>
        <button
          type="button"
          className="back-button"
          onClick={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
        >
          {t('menu')}
        </button>
      </div>
    );
  }

  const me = s.players.find((p) => p.id === s.playerId);
  const canYieldNow =
    s.isMyTurn &&
    s.phase === 'choose_action' &&
    localCanYield(s.consecutiveYields, s.players.length);
  const victoryLevel =
    s.result === 'victory' ? (s.jestersUsed === 0 ? 'gold' : s.jestersUsed === 1 ? 'silver' : 'bronze') : null;
  const roomNameById = new Map((online.room?.players ?? []).map((p) => [p.id, p.name]));
  const currentName = roomNameById.get(s.players[s.currentPlayerIndex]!.id) ?? t('player');
  const currentId = s.players[s.currentPlayerIndex]!.id;
  const gamePlayerById = new Map(s.players.map((p) => [p.id, p]));
  const rivals = (online.room?.players ?? [])
    .filter((p) => p.id !== s.playerId && gamePlayerById.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      handCount: gamePlayerById.get(p.id)!.handCount,
      connected: p.connected,
      isCurrent: p.id === currentId,
    }));

  const isMyTurnAndChoosing = s.isMyTurn && s.phase === 'choose_action';
  let banner: BoardBanner | null = null;
  if (s.phase === 'choose_action' || s.phase === 'suffer_damage') {
    banner =
      isMyTurnAndChoosing || (s.phase === 'suffer_damage' && s.isMyTurn)
        ? {
            title: t('stepLabel', { n: s.phase === 'suffer_damage' ? 4 : 1 }),
            description: isMyTurnAndChoosing
              ? t('phaseChoose')
              : t('phaseSuffer', {
                  attack: effectiveAttack(s.enemy),
                  value: online.selectionValue,
                }),
          }
        : { title: t('turnOf', { name: currentName }), waiting: true };
  }

  return (
    <GameBoard
      phase={s.phase}
      hand={s.hand}
      maxHandSize={me?.maxHandSize ?? 0}
      table={s.table}
      discardPile={s.discardPile}
      tavernCount={s.tavernCount}
      castleCount={s.castleCount}
      enemy={s.enemy}
      turnNumber={s.turnNumber}
      jestersLeft={s.jestersLeft}
      lastDamageDealt={s.lastDamageDealt}
      log={s.log}
      banner={banner}
      selectedIds={online.selected}
      isMyTurn={s.isMyTurn}
      canPlay={online.canPlay}
      canYieldNow={canYieldNow}
      showJester={online.canPlayJester}
      error={online.error}
      headerMeta={t('roomCodeX', { code: online.room?.code ?? '' })}
      onMenu={() => setConfirmLeave(true)}
      headerRight={<RivalsPanel rivals={rivals} />}
      playerNameById={Object.fromEntries(roomNameById)}
      onToggleCard={online.toggle}
      onClearSelection={online.clearSelection}
      onPlay={online.play}
      onYieldTurn={online.yieldTurn}
      onDiscard={online.discard}
      onJester={() => setJesterPick(true)}
    >
      {confirmLeave && (
        <ConfirmDialog
          title={t('confirmLeaveTitle')}
          body={t('confirmLeaveBody')}
          confirmLabel={t('confirmLeaveYes')}
          cancelLabel={t('confirmLeaveNo')}
          onConfirm={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
          onCancel={() => setConfirmLeave(false)}
        />
      )}

      {s.phase === 'game_over' && (
        <VictoryOverlay
          victory={s.result === 'victory'}
          victoryLevel={victoryLevel}
          onNewGame={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
          onHome={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
        />
      )}

      {jesterPick && (
        <JesterPickOverlay
          otherPlayers={(online.room?.players ?? []).filter(
            (p) => p.id !== s.playerId && s.players.some((gp) => gp.id === p.id),
          )}
          onPick={(targetId) => {
            online.playJester(targetId);
            setJesterPick(false);
          }}
          onCancel={() => setJesterPick(false)}
        />
      )}
    </GameBoard>
  );
}

interface JesterPickOverlayProps {
  otherPlayers: { id: string; name: string }[];
  onPick: (targetId: string) => void;
  onCancel: () => void;
}

function JesterPickOverlay({ otherPlayers, onPick, onCancel }: JesterPickOverlayProps) {
  const { t } = useLanguage();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="jester-pick-title">
      <div className="overlay-card">
        <h2 className="overlay-title" id="jester-pick-title">
          {t('jester')}
        </h2>
        <p className="overlay-subtitle">{t('jesterPickSubtitle')}</p>
        <div className="overlay-actions">
          {otherPlayers.map((player) => (
            <button
              key={player.id}
              type="button"
              className="menu-button"
              onClick={() => onPick(player.id)}
            >
              {player.name}
            </button>
          ))}
          <button type="button" className="back-button" onClick={onCancel}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
