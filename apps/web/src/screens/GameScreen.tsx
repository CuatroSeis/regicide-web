import { useEffect, useMemo, useRef } from 'react';
import { canYield, effectiveAttack, gameSummary } from '@regicide/engine';
import { useGame } from '../hooks/useGame';
import { useCardDrag } from '../hooks/useCardDrag';
import { CardDragGhost } from '../components/CardDragGhost';
import { EnemyPanel } from '../components/EnemyPanel';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { CardFace } from '../components/CardFace';
import { CardFan } from '../components/CardFan';
import { StepBanner } from '../components/StepBanner';
import { DeckChip } from '../components/DeckCounters';
import { CardTravel } from '../components/CardTravel';
import type { CardTravelSnapshot, CardTravelZones } from '../components/CardTravel';
import { useLanguage } from '../i18n/LanguageContext';
import { submitScore } from '../lib/leaderboard';
import type { SoloSetup } from './SetupScreen';

interface GameScreenProps {
  setup: SoloSetup;
  /** Nueva semilla con el mismo nombre (vuelve a jugar). */
  onRestart: () => void;
  onHome: () => void;
  onViewLeaderboard: () => void;
}

export function GameScreen({ setup, onRestart, onHome, onViewLeaderboard }: GameScreenProps) {
  const { t } = useLanguage();
  const game = useGame(setup.seed);
  const s = game.snapshot;
  const player = s.players[s.currentPlayerIndex]!;
  const isSuffering = s.phase === 'suffer_damage';
  const canYieldNow = s.phase === 'choose_action' && canYield(s);
  const showJester = s.jestersLeft > 0 && (s.phase === 'choose_action' || s.phase === 'suffer_damage');
  const summary = useMemo(() => (s.result ? gameSummary(s) : null), [s]);
  const submitted = useRef(false);

  useEffect(() => {
    if (!s.result || submitted.current) return;
    submitted.current = true;
    if (!summary) return;
    void submitScore({
      name: setup.name,
      seed: setup.seed,
      result: summary.result ?? 'defeat',
      enemiesDefeated: summary.enemiesDefeated,
      enemyCard: summary.enemyCard,
      jestersUsed: summary.jestersUsed,
      turnNumber: summary.turnNumber,
    }).catch(() => {
      /* La tabla es best-effort: si falla, no interrumpimos la partida. */
    });
  }, [s.result, summary, setup]);

  const logTail = s.log.slice(-5);

  const banner =
    s.phase === 'choose_action'
      ? { title: t('stepLabel', { n: 1 }), description: t('phaseChoose'), log: logTail }
      : isSuffering
        ? {
            title: t('stepLabel', { n: 4 }),
            description: t('phaseSuffer', {
              attack: effectiveAttack(s.enemy),
              value: game.selectionValue,
            }),
            log: logTail,
          }
        : null;

  const deckRef = useRef<HTMLDivElement>(null);
  const castleRef = useRef<HTMLSpanElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);

  const travelSnapshot = useMemo<CardTravelSnapshot>(
    () => ({
      hand: player.hand,
      table: s.table,
      discardPile: s.discardPile,
      tavernCount: s.tavernDeck.length,
      turnNumber: s.turnNumber,
    }),
    [s, player],
  );
  const zones: CardTravelZones = {
    deck: deckRef,
    discard: discardRef,
    hand: handRef,
    table: tableRef,
    enemy: enemyRef,
  };

  const { drag, onCardPointerDown } = useCardDrag({
    enabled: s.phase === 'choose_action',
    selectedIds: game.selected,
    canPlay: game.canPlay,
    toggle: game.toggle,
    play: game.play,
    tableRef,
    enemyRef,
  });

  return (
    <div className="screen game-screen">
      {s.phase === 'game_over' && (
        <VictoryOverlay
          victory={s.result === 'victory'}
          victoryLevel={game.victoryLevel}
          rank={summary?.rank}
          onNewGame={onRestart}
          onHome={onHome}
          onViewLeaderboard={onViewLeaderboard}
        />
      )}

      <CardTravel snapshot={travelSnapshot} zones={zones} />

      <header className="game-header">
        <div className="header-left">
          <button type="button" className="back-button" onClick={onHome}>
            {t('menu')}
          </button>
          <span className="meta">
            {t('playingAs', { name: setup.name })} · {t('seedLabel', { seed: setup.seed })}
          </span>
        </div>
        <DeckChip label={t('castle')} value={s.castleDeck.length} ref={castleRef} />
        <div className="header-right" />
      </header>

      <EnemyPanel
        enemy={s.enemy}
        turnNumber={s.turnNumber}
        jestersLeft={s.jestersLeft}
        lastDamageDealt={s.lastDamageDealt}
        tavernCount={s.tavernDeck.length}
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

      {game.error && <div className="error-banner">{game.error}</div>}

      {banner && <StepBanner key={`${s.turnNumber}-${s.phase}`} {...banner} />}

      <div className="hand-area" ref={handRef}>
        <span className="zone-label">
          {t('hand', { hand: player.hand.length, max: player.maxHandSize })}
        </span>
        <CardFan
          cards={player.hand}
          width={104}
          selectedIds={game.selected}
          onSelect={game.toggle}
          onCardPointerDown={onCardPointerDown}
          suppressClick={drag !== null}
        />
      </div>

      {drag && (
        <CardDragGhost
          cards={player.hand.filter((card) => drag.ids.includes(card.id))}
          width={104}
          x={drag.x}
          y={drag.y}
        />
      )}

      <div className="controls">
        {s.phase === 'choose_action' && (
          <>
            <button
              type="button"
              className="menu-button"
              disabled={!game.canPlay}
              onClick={game.play}
            >
              {t('play')}
            </button>
            <button
              type="button"
              className="menu-button"
              disabled={!canYieldNow}
              onClick={game.yieldTurn}
            >
              {t('yield')}
            </button>
          </>
        )}
        {isSuffering && (
          <button
            type="button"
            className="menu-button"
            disabled={!game.canDiscard}
            onClick={game.discard}
          >
            {t('coverDamage')}
          </button>
        )}
        {showJester && (
          <button type="button" className="menu-button" onClick={game.jester}>
            {t('jester')} ({s.jestersLeft})
          </button>
        )}
        {(s.phase === 'choose_action' || isSuffering) && game.selected.length > 0 && (
          <button type="button" className="back-button" onClick={game.clearSelection}>
            {t('clear')}
          </button>
        )}
      </div>
    </div>
  );
}
