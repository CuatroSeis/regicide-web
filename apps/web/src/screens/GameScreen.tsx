import { useEffect, useMemo, useRef } from 'react';
import { canYield, effectiveAttack, gameSummary } from '@regicide/engine';
import { useGame } from '../hooks/useGame';
import { GameBoard } from '../components/GameBoard';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
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
  const { user } = useAuth();
  const game = useGame(setup.seed);
  const s = game.snapshot;
  const player = s.players[s.currentPlayerIndex]!;
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
      userId: user?.id ?? 'anonymous',
    }).catch(() => {
      /* La tabla es best-effort: si falla, no interrumpimos la partida. */
    });
  }, [s.result, summary, setup]);

  const hint =
    s.phase === 'choose_action'
      ? { text: t('phaseChoose') }
      : s.phase === 'suffer_damage'
        ? {
            text: t('phaseSuffer', {
              attack: effectiveAttack(s.enemy),
              value: game.selectionValue,
            }),
          }
        : null;

  return (
    <GameBoard
      phase={s.phase}
      hand={player.hand}
      maxHandSize={player.maxHandSize}
      table={s.table}
      discardPile={s.discardPile}
      tavernCount={s.tavernDeck.length}
      castleCount={s.castleDeck.length}
      enemy={s.enemy}
      turnNumber={s.turnNumber}
      jestersLeft={s.jestersLeft}
      lastDamageDealt={s.lastDamageDealt}
      log={s.log}
      hint={hint}
      selectedIds={game.selected}
      isMyTurn
      canPlay={game.canPlay}
      canDiscard={game.canDiscard}
      canYieldNow={s.phase === 'choose_action' && canYield(s)}
      showJester={
        s.jestersLeft > 0 && (s.phase === 'choose_action' || s.phase === 'suffer_damage')
      }
      jesterCount={s.jestersLeft}
      error={game.error}
      headerMeta={`${t('playingAs', { name: setup.name })} · ${t('seedLabel', { seed: setup.seed })}`}
      onMenu={onHome}
      onToggleCard={game.toggle}
      onClearSelection={game.clearSelection}
      onPlay={game.play}
      onYieldTurn={game.yieldTurn}
      onDiscard={game.discard}
      onJester={game.jester}
    >
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
    </GameBoard>
  );
}
