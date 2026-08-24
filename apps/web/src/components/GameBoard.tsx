import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Card, Enemy, LogEntry, Phase, PlayedCard } from '@regicide/engine';
import { useCardDrag } from '../hooks/useCardDrag';
import { useFitWidth } from '../hooks/useFitWidth';
import { handMetrics } from '../lib/handMetrics';
import { formatLogEntry } from '../lib/logFormat';
import { CardDragGhost } from './CardDragGhost';
import { EnemyPanel } from './EnemyPanel';
import { CardFace } from './CardFace';
import { CardFan } from './CardFan';
import { DeckChip } from './DeckCounters';
import { CardTravel } from './CardTravel';
import type { CardTravelSnapshot, CardTravelZones } from './CardTravel';
import { useLanguage } from '../i18n/LanguageContext';

/** Hint ya localizado por el screen (difiere entre solo y online). */
export interface BoardHint {
  text: string;
  /** Estado de espera (online): tenue. */
  waiting?: boolean;
}

/** Ancho de las cartas jugadas en la mesa. */
const TABLE_CARD_WIDTH = 60;

interface GameBoardProps {
  phase: Phase;
  hand: readonly Card[];
  maxHandSize: number;
  table: readonly PlayedCard[];
  discardPile: readonly Card[];
  tavernCount: number;
  castleCount: number;
  enemy: Enemy;
  turnNumber: number;
  jestersLeft: number;
  lastDamageDealt: number;
  log: readonly LogEntry[];

  /** null → sin hint (fin de partida). */
  hint?: BoardHint | null;

  selectedIds: string[];
  /** Solo: siempre true. Online: lo decide el server. */
  isMyTurn: boolean;
  canPlay: boolean;
  /** Selección cubre el daño del paso 4 (habilita "Cubrir daño" y el drop defensivo). */
  canDiscard?: boolean;
  canYieldNow: boolean;
  showJester: boolean;
  /** Contador "(N)" junto al botón Jester (solo). */
  jesterCount?: number | null;
  /** Mensaje de error de la última acción. */
  error?: string | null;

  headerMeta: string;
  onMenu: () => void;
  /** Slot derecho del header (panel de rivales en online). */
  headerRight?: ReactNode;
  /**
   * Nombres por id de jugador para atribuir las cartas de la mesa.
   * Si no se pasa (solitario), los chips de autoría no se muestran.
   */
  playerNameById?: Record<string, string>;

  onToggleCard: (cardId: string) => void;
  onClearSelection: () => void;
  onPlay: () => void;
  onYieldTurn: () => void;
  onDiscard: () => void;
  onJester: () => void;

  /** Overlays del screen (VictoryOverlay, ConfirmDialog, Jester…). */
  children?: ReactNode;
}

/**
 * Tablero compartido entre el modo solitario y el multijugador.
 * Renderiza el shell completo y es dueño de las refs de zonas,
 * el drag y las animaciones de viaje de cartas.
 */
export function GameBoard({
  phase,
  hand,
  maxHandSize,
  table,
  discardPile,
  tavernCount,
  castleCount,
  enemy,
  turnNumber,
  jestersLeft,
  lastDamageDealt,
  log,
  hint,
  selectedIds,
  isMyTurn,
  canPlay,
  canDiscard = false,
  canYieldNow,
  showJester,
  jesterCount,
  error,
  headerMeta,
  onMenu,
  headerRight,
  playerNameById,
  onToggleCard,
  onClearSelection,
  onPlay,
  onYieldTurn,
  onDiscard,
  onJester,
  children,
}: GameBoardProps) {
  const { t } = useLanguage();
  const isSuffering = phase === 'suffer_damage';
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    if (!logOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logOpen]);

  const deckRef = useRef<HTMLDivElement>(null);
  const castleRef = useRef<HTMLSpanElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const handWidth = useFitWidth(handRef);
  const handCardMetrics = handMetrics(handWidth, hand.length);

  const logTail = useMemo(
    () => log.map((entry) => formatLogEntry(entry, t)),
    [log, t],
  );

  const travelSnapshot = useMemo<CardTravelSnapshot>(
    () => ({
      hand: [...hand],
      table: [...table],
      discardPile: [...discardPile],
      tavernCount,
      turnNumber,
    }),
    [hand, table, discardPile, tavernCount, turnNumber],
  );
  const zones: CardTravelZones = {
    deck: deckRef,
    discard: discardRef,
    hand: handRef,
    table: tableRef,
    enemy: enemyRef,
  };

  const { drag, onCardPointerDown } = useCardDrag({
    enabled: isMyTurn && (phase === 'choose_action' || isSuffering),
    mode: isSuffering ? 'defend' : 'attack',
    selectedIds,
    canPlay,
    canDiscard,
    toggle: onToggleCard,
    play: onPlay,
    discard: onDiscard,
    tableRef,
    enemyRef,
  });

  /** Cartas consecutivas del mismo jugador agrupadas (chip de autoría). */
  const tableGroups = useMemo(() => {
    const groups: { playerId: string; cards: Card[] }[] = [];
    for (const played of table) {
      const last = groups[groups.length - 1];
      if (last && last.playerId === played.playerId) last.cards.push(played.card);
      else groups.push({ playerId: played.playerId, cards: [played.card] });
    }
    return groups;
  }, [table]);

  return (
    <div className="screen game-screen">
      {children}

      <CardTravel snapshot={travelSnapshot} zones={zones} />

      <div className="game-inner">
        <header className="game-header">
          <div className="header-left">
            <button type="button" className="back-button" onClick={onMenu}>
              {t('menu')}
            </button>
            <button
              type="button"
              className="back-button"
              aria-haspopup="dialog"
              onClick={() => setLogOpen(true)}
            >
              {t('logTitle')}
            </button>
            <span className="meta">{headerMeta}</span>
          </div>
          <DeckChip label={t('castle')} value={castleCount} ref={castleRef} />
          <div className="header-right">{headerRight}</div>
        </header>

        <EnemyPanel
          enemy={enemy}
          turnNumber={turnNumber}
          jestersLeft={jestersLeft}
          lastDamageDealt={lastDamageDealt}
          tavernCount={tavernCount}
          discardCount={discardPile.length}
          discardTopCard={discardPile[discardPile.length - 1]}
          deckRef={deckRef}
          discardRef={discardRef}
          ref={enemyRef}
        />

        <div className="table-area">
          <span className="zone-label">{t('table')}</span>
          <div
            className={
              drag?.overTable && !isSuffering ? 'table-cards drag-over' : 'table-cards'
            }
            ref={tableRef}
          >
            {table.length === 0 ? (
              <span className="muted">{t('playEmptyHint')}</span>
            ) : (
              tableGroups.map((group, index) => {
                const owner =
                  playerNameById?.[group.playerId] ?? (playerNameById ? t('player') : null);
                return (
                  <div
                    key={`${group.playerId}-${index}`}
                    className="table-group"
                  >
                    <div className="table-group-cards">
                      {group.cards.map((card) => (
                        <CardFace
                          key={`${group.playerId}-${card.id}`}
                          card={card}
                          width={TABLE_CARD_WIDTH}
                        />
                      ))}
                    </div>
                    {owner && <span className="table-group-owner">{owner}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="hand-area" ref={handRef}>
          <span className="zone-label">
            {t('hand', { hand: hand.length, max: maxHandSize })}
          </span>
          <CardFan
            cards={[...hand]}
            width={handCardMetrics.width}
            overlap={handCardMetrics.overlap}
            selectedIds={selectedIds}
            onSelect={isMyTurn ? onToggleCard : undefined}
            onCardPointerDown={onCardPointerDown}
            suppressClick={drag !== null}
          />
        </div>

        <div className="controls">
          {hint && (phase === 'choose_action' || isSuffering) && (
            <p className={hint.waiting ? 'action-hint action-hint--wait' : 'action-hint'} aria-live="polite">
              {hint.text}
            </p>
          )}
          {phase === 'choose_action' && isMyTurn && (
            <>
              <button type="button" className="menu-button" disabled={!canPlay} onClick={onPlay}>
                {t('play')}
              </button>
              <button
                type="button"
                className="menu-button"
                disabled={!canYieldNow}
                onClick={onYieldTurn}
              >
                {t('yield')}
              </button>
            </>
          )}
          {isSuffering && isMyTurn && (
            <button
              type="button"
              className="menu-button"
              disabled={!canDiscard}
              onClick={onDiscard}
            >
              {t('coverDamage')}
            </button>
          )}
          {showJester && (
            <button type="button" className="menu-button" onClick={onJester}>
              {t('jester')}
              {jesterCount != null ? ` (${jesterCount})` : ''}
            </button>
          )}
          {(phase === 'choose_action' || isSuffering) && selectedIds.length > 0 && (
            <button type="button" className="back-button" onClick={onClearSelection}>
              {t('clear')}
            </button>
          )}
        </div>
      </div>

      {drag && (
        <CardDragGhost
          cards={[...hand].filter((card) => drag.ids.includes(card.id))}
          width={handCardMetrics.width}
          x={drag.x}
          y={drag.y}
        />
      )}

      {logOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="log-overlay-title">
          <div className="overlay-card log-overlay-card">
            <h2 className="overlay-title" id="log-overlay-title">
              {t('logTitle')}
            </h2>
            <div className="log-overlay-list">
              {logTail.length === 0 ? (
                <p className="muted">{t('playEmptyHint')}</p>
              ) : (
                logTail.map((entry, index) => (
                  <p key={index} className="log-line">
                    {entry}
                  </p>
                ))
              )}
            </div>
            <div className="overlay-actions">
              <button type="button" className="menu-button" onClick={() => setLogOpen(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}