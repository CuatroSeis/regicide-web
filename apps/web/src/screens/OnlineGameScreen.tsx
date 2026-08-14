import { useState } from 'react';
import { effectiveAttack } from '@regicide/engine';
import type { ScreenProps } from '../navigation';
import type { OnlineSessionResult } from '../hooks/useOnlineGame';
import { EnemyPanel } from '../components/EnemyPanel';
import { VictoryOverlay } from '../components/VictoryOverlay';
import { CardFace } from '../components/CardFace';
import { CardFan } from '../components/CardFan';

interface OnlineGameScreenProps extends ScreenProps {
  online: OnlineSessionResult;
}

function localCanYield(consecutiveYields: number, playerCount: number): boolean {
  return playerCount === 1 || consecutiveYields < playerCount - 1;
}

/** Tablero multijugador: el estado viene del server (PlayerGameState), no local. */
export function OnlineGameScreen({ online, onNavigate }: OnlineGameScreenProps) {
  const s = online.state;
  const [jesterPick, setJesterPick] = useState(false);

  if (!s) {
    return (
      <div className="screen game-screen">
        <p className="muted">Esperando estado de la partida…</p>
        <button
          type="button"
          className="back-button"
          onClick={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
        >
          ← Menú
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
  const currentName = roomNameById.get(s.players[s.currentPlayerIndex]!.id) ?? 'Jugador';
  const gamePlayerIds = new Set(s.players.map((p) => p.id));
  const otherPlayers = (online.room?.players ?? []).filter((p) => p.id !== s.playerId && gamePlayerIds.has(p.id));

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

      <header className="game-header">
        <button
          type="button"
          className="back-button"
          onClick={() => {
            online.leaveRoom();
            onNavigate('home');
          }}
        >
          ← Menú
        </button>
        <span className="meta">Sala {online.room?.code}</span>
      </header>

      <EnemyPanel enemy={s.enemy} turnNumber={s.turnNumber} jestersLeft={s.jestersLeft} />

      <div className="turn-indicator">
        {s.isMyTurn ? 'Es tu turno' : `Turno de ${currentName}`}
      </div>

      <div className="table-area">
        <span className="zone-label">Mesa</span>
        <div className="table-cards">
          {s.table.length === 0 ? (
            <span className="muted">Juega cartas contra el enemigo</span>
          ) : (
            s.table.map(({ card, playerId }) => (
              <CardFace key={`${playerId}-${card.id}`} card={card} width={48} />
            ))
          )}
        </div>
      </div>

      {online.error && <div className="error-banner">{online.error}</div>}

      <div className="phase-hint">
        {s.phase === 'choose_action' &&
          (s.isMyTurn
            ? 'Paso 1 — Elige cartas (combo, par, As…) y juega, ríndete o usa el Jester.'
            : 'Espera tu turno…')}
        {isSuffering &&
          `Paso 4 — Descarta cartas para cubrir el ataque de ${effectiveAttack(s.enemy)} (${online.selectionValue} seleccionado).`}
      </div>

      <div className="hand-area">
        <span className="zone-label">
          Mano ({s.hand.length}/{me?.maxHandSize ?? 0})
        </span>
        <CardFan
          cards={[...s.hand]}
          width={72}
          selectedIds={online.selected}
          onSelect={s.isMyTurn ? online.toggle : undefined}
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
              Jugar
            </button>
            <button
              type="button"
              className="menu-button"
              disabled={!canYieldNow}
              onClick={online.yieldTurn}
            >
              Rendirse
            </button>
            {online.canPlayJester && (
              <button type="button" className="menu-button" onClick={() => setJesterPick(true)}>
                Jester
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
            Cubrir daño
          </button>
        )}
        {(s.phase === 'choose_action' || isSuffering) && online.selected.length > 0 && (
          <button type="button" className="back-button" onClick={online.clearSelection}>
            Limpiar
          </button>
        )}
      </div>

      {jesterPick && (
        <div className="overlay">
          <div className="overlay-card">
            <h2 className="overlay-title">Jester</h2>
            <p className="overlay-subtitle">Elegí quién empieza el próximo turno [R-20]</p>
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
              ))}              <button type="button" className="back-button" onClick={() => setJesterPick(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
