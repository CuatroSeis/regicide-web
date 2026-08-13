import type { Enemy, Suit } from '@regicide/engine';
import { effectiveAttack } from '@regicide/engine';
import { CardFace } from './CardFace';

const RANK_NAME: Record<string, string> = { J: 'Jota', Q: 'Reina', K: 'Rey' };
const SUIT_NAME: Record<Suit, string> = {
  hearts: 'Corazones',
  diamonds: 'Diamantes',
  clubs: 'Tréboles',
  spades: 'Picas',
};
const SUIT_SYMBOL: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

interface EnemyPanelProps {
  enemy: Enemy;
  turnNumber: number;
  jestersLeft: number;
}

export function EnemyPanel({ enemy, turnNumber, jestersLeft }: EnemyPanelProps) {
  const remaining = enemy.maxHealth - enemy.damageTaken;
  const pct = Math.max(0, Math.min(100, (remaining / enemy.maxHealth) * 100));
  const attack = effectiveAttack(enemy);
  const suit = enemy.card.suit!;

  return (
    <div className="enemy-panel">
      <div className="enemy-card">
        <CardFace card={enemy.card} width={110} />
        {enemy.spadeShield > 0 && <span className="badge shield-badge">♠ {enemy.spadeShield}</span>}
      </div>
      <div className="enemy-info">
        <div className="enemy-name">
          {RANK_NAME[enemy.card.rank!]} de {SUIT_NAME[suit]}
        </div>
        <div className="health-row">
          <span className="health-label">Vida</span>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${pct}%`, background: pct > 40 ? 'var(--gold)' : '#d15454' }}
            />
          </div>
          <span className="health-value">
            {remaining}/{enemy.maxHealth}
          </span>
        </div>
        <div className="stats-row">
          <span className="stat">Ataque: {attack}</span>
          {enemy.spadeShield > 0 && <span className="stat">Escudo: ♠ {enemy.spadeShield}</span>}
          <span className="stat">Turno: {turnNumber}</span>
          <span className="stat">Jesters: {jestersLeft}</span>
        </div>
        <div className="immunity">Inmune a {SUIT_SYMBOL[suit]} ({SUIT_NAME[suit]})</div>
      </div>
    </div>
  );
}
