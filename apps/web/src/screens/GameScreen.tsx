import { useMemo, useRef } from 'react';
import { canYield, effectiveAttack } from '@regicide/engine';
import type { ScreenProps } from '../navigation';
import { useGame } from '../hooks/useGame';
import { EnemyPanel } from '../components/EnemyPanel';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { CardFace } from '../components/CardFace';
import { CardFan } from '../components/CardFan';
import { DeckChip } from '../components/DeckCounters';
import { CardTravel } from '../components/CardTravel';
import type { CardTravelSnapshot, CardTravelZones } from '../components/CardTravel';

export function GameScreen({ onNavigate }: ScreenProps) {
  const game = useGame();
  const s = game.snapshot;
  const player = s.players[s.currentPlayerIndex]!;
  const isSuffering = s.phase === 'suffer_damage';
  const canYieldNow = s.phase === 'choose_action' && canYield(s);
  const showJester = s.jestersLeft > 0 && (s.phase === 'choose_action' || s.phase === 'suffer_damage');

  const logTail = s.log.slice(-5);

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

  return (
    <div className="screen game-screen">
      {s.phase === 'game_over' && (
        <VictoryOverlay
          victory={s.result === 'victory'}
          victoryLevel={game.victoryLevel}
          onNewGame={() => game.newGame()}
          onHome={() => onNavigate('home')}
        />
      )}

      <CardTravel snapshot={travelSnapshot} zones={zones} />

      <header className="game-header">
        <div className="header-left">
          <button type="button" className="back-button" onClick={() => onNavigate('home')}>
            ← Menú
          </button>
          <span className="meta">Semilla: {game.seed}</span>
        </div>
        <DeckChip label="Castillo" value={s.castleDeck.length} ref={castleRef} />
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
        <span className="zone-label">Mesa</span>
        <div className="table-cards" ref={tableRef}>
          {s.table.length === 0 ? (
            <span className="muted">Juega cartas contra el enemigo</span>
          ) : (
            s.table.map(({ card, playerId }) => (
              <CardFace key={`${playerId}-${card.id}`} card={card} width={48} />
            ))
          )}
        </div>
      </div>

      {game.error && <div className="error-banner">{game.error}</div>}

      <div className="phase-hint">
        {s.phase === 'choose_action' &&
          'Paso 1 — Elige cartas (combo, par, As…) y juega, ríndete o usa el Jester.'}
        {isSuffering &&
          `Paso 4 — Descarta cartas para cubrir el ataque de ${effectiveAttack(s.enemy)} (${game.selectionValue} seleccionado).`}
      </div>

      <div className="hand-area" ref={handRef}>
        <span className="zone-label">
          Mano ({player.hand.length}/{player.maxHandSize})
        </span>
        <CardFan
          cards={player.hand}
          width={72}
          selectedIds={game.selected}
          onSelect={game.toggle}
        />
      </div>

      <div className="controls">
        {s.phase === 'choose_action' && (
          <>
            <button
              type="button"
              className="menu-button"
              disabled={!game.canPlay}
              onClick={game.play}
            >
              Jugar
            </button>
            <button
              type="button"
              className="menu-button"
              disabled={!canYieldNow}
              onClick={game.yieldTurn}
            >
              Rendirse
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
            Cubrir daño
          </button>
        )}
        {showJester && (
          <button type="button" className="menu-button" onClick={game.jester}>
            Jester ({s.jestersLeft})
          </button>
        )}
        {(s.phase === 'choose_action' || isSuffering) && game.selected.length > 0 && (
          <button type="button" className="back-button" onClick={game.clearSelection}>
            Limpiar
          </button>
        )}
      </div>

      <div className="log-box">
        {logTail.map((entry, index) => (
          <div key={`${s.turnNumber}-${index}`} className="log-line">
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
