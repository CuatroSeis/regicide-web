import { useMemo, useRef, useState } from 'react';
import { effectiveAttack } from '@regicide/engine';
import type { ScreenProps } from '../navigation';
import type { OnlineSessionResult } from '../hooks/useOnlineGame';
import { EnemyPanel } from '../components/EnemyPanel';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { CardFace } from '../components/CardFace';
import { CardFan } from '../components/CardFan';
import { StepBanner } from '../components/StepBanner';
import { DeckChip } from '../components/DeckCounters';
import { CardTravel } from '../components/CardTravel';
import type { CardTravelSnapshot, CardTravelZones } from '../components/CardTravel';
import { CardDragGhost } from '../components/CardDragGhost';
import { useCardDrag } from '../hooks/useCardDrag';
import { useFitWidth } from '../hooks/useFitWidth';
import { handMetrics } from '../lib/handMetrics';
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
  const isSuffering = s.phase === 'suffer_damage';
  const canYieldNow = s.isMyTurn && s.phase === 'choose_action' && localCanYield(s.consecutiveYields, s.players.length);
  const victoryLevel = s.result === 'victory' ? (s.jestersUsed === 0 ? 'gold' : s.jestersUsed === 1 ? 'silver' : 'bronze') : null;
  const logTail = s.log.slice(-5);
  const roomNameById = new Map((online.room?.players ?? []).map((p) => [p.id, p.name]));
  const currentName = roomNameById.get(s.players[s.currentPlayerIndex]!.id) ?? t('player');
  const gamePlayerIds = new Set(s.players.map((p) => p.id));
  const otherPlayers = (online.room?.players ?? []).filter((p) => p.id !== s.playerId && gamePlayerIds.has(p.id));

  const isMyTurnAndChoosing = s.isMyTurn && s.phase === 'choose_action';
  const banner = s.phase === 'choose_action' || isSuffering
    ? {
        waiting: !s.isMyTurn,
        title: isMyTurnAndChoosing || (isSuffering && s.isMyTurn)
          ? t('stepLabel', { n: isSuffering ? 4 : 1 })
          : t('turnOf', { name: currentName }),
        description:
          isMyTurnAndChoosing
            ? t('phaseChoose')
            : isSuffering && s.isMyTurn
              ? t('phaseSuffer', {
                  attack: effectiveAttack(s.enemy),
                  value: online.selectionValue,
                })
              : undefined,
        log: logTail,
      }
    : null;

  const deckRef = useRef<HTMLDivElement>(null);
  const castleRef = useRef<HTMLSpanElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const handWidth = useFitWidth(handRef);
  const handCardMetrics = handMetrics(handWidth, s.hand.length);

  const travelSnapshot = useMemo<CardTravelSnapshot>(
    () => ({
      hand: s.hand,
      table: s.table,
      discardPile: s.discardPile,
      tavernCount: s.tavernCount,
      turnNumber: s.turnNumber,
    }),
    [s],
  );
  const zones: CardTravelZones = {
    deck: deckRef,
    discard: discardRef,
    hand: handRef,
    table: tableRef,
    enemy: enemyRef,
  };

  const { drag, onCardPointerDown } = useCardDrag({
    enabled: s.isMyTurn && s.phase === 'choose_action',
    selectedIds: online.selected,
    canPlay: online.canPlay,
    toggle: online.toggle,
    play: online.play,
    tableRef,
    enemyRef,
  });

  return (
    <div className="screen game-screen">
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

      <CardTravel snapshot={travelSnapshot} zones={zones} />

      <div className="game-inner">
        <header className="game-header">
          <div className="header-left">
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
            <span className="meta">{t('roomCodeX', { code: online.room?.code ?? '' })}</span>
          </div>
          <DeckChip label={t('castle')} value={s.castleCount} ref={castleRef} />
          <div className="header-right" />
        </header>

        <EnemyPanel
          enemy={s.enemy}
          turnNumber={s.turnNumber}
          jestersLeft={s.jestersLeft}
          lastDamageDealt={s.lastDamageDealt}
          tavernCount={s.tavernCount}
          discardCount={s.discardPile.length}
          discardTopCard={s.discardPile[s.discardPile.length - 1]}
          deckRef={deckRef}
          discardRef={discardRef}
          ref={enemyRef}
        />

        <div className="table-area">
          <span className="zone-label">{t('table')}</span>
          <div
            className={drag?.overTable ? 'table-cards drag-over' : 'table-cards'}
            ref={tableRef}
          >
            {s.table.length === 0 ? (
              <span className="muted">{t('playEmptyHint')}</span>
            ) : (
              s.table.map(({ card, playerId }) => (
                <CardFace key={`${playerId}-${card.id}`} card={card} width={48} />
              ))
            )}
          </div>
        </div>

        {online.error && <div className="error-banner">{online.error}</div>}

        {banner && <StepBanner key={`${s.turnNumber}-${s.phase}`} {...banner} />}

        <div className="hand-area" ref={handRef}>
          <span className="zone-label">
            {t('hand', { hand: s.hand.length, max: me?.maxHandSize ?? 0 })}
          </span>
          <CardFan
            cards={[...s.hand]}
            width={handCardMetrics.width}
            overlap={handCardMetrics.overlap}
            selectedIds={online.selected}
            onSelect={s.isMyTurn ? online.toggle : undefined}
            onCardPointerDown={onCardPointerDown}
            suppressClick={drag !== null}
          />
        </div>

        <div className="controls">
          {s.phase === 'choose_action' && s.isMyTurn && (
            <>
              <button
                type="button"
                className="menu-button"
                disabled={!online.canPlay}
                onClick={online.play}
              >
                {t('play')}
              </button>
              <button
                type="button"
                className="menu-button"
                disabled={!canYieldNow}
                onClick={online.yieldTurn}
              >
                {t('yield')}
              </button>
              {online.canPlayJester && (
                <button type="button" className="menu-button" onClick={() => setJesterPick(true)}>
                  {t('jester')}
                </button>
              )}
            </>
          )}
          {isSuffering && s.isMyTurn && (
            <button
              type="button"
              className="menu-button"
              disabled={!online.canDiscard}
              onClick={online.discard}
            >
              {t('coverDamage')}
            </button>
          )}
          {(s.phase === 'choose_action' || isSuffering) && online.selected.length > 0 && (
            <button type="button" className="back-button" onClick={online.clearSelection}>
              {t('clear')}
            </button>
          )}
        </div>
      </div>

      {drag && (
        <CardDragGhost
          cards={s.hand.filter((card) => drag.ids.includes(card.id))}
          width={handCardMetrics.width}
          x={drag.x}
          y={drag.y}
        />
      )}

      {jesterPick && (
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
                  onClick={() => {
                    online.playJester(player.id);
                    setJesterPick(false);
                  }}
                >
                  {player.name}
                </button>
              ))}
              <button type="button" className="back-button" onClick={() => setJesterPick(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
