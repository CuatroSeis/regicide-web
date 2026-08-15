import type { Card, Enemy, Suit } from '@regicide/engine';
import { effectiveAttack } from '@regicide/engine';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Ref } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { CardFace } from './CardFace';
import { CardPile } from './CardPile';

const RANK_KEY: Record<string, TranslationKey> = { J: 'rankJ', Q: 'rankQ', K: 'rankK' };
const SUIT_NAME_KEY: Record<Suit, TranslationKey> = {
  hearts: 'suitHearts',
  diamonds: 'suitDiamonds',
  clubs: 'suitClubs',
  spades: 'suitSpades',
};
const SUIT_SYMBOL: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

interface EnemyPanelProps {
  enemy: Enemy;
  turnNumber: number;
  jestersLeft: number;
  /** Último daño infligido al enemigo (para el número flotante). */
  lastDamageDealt: number;
  /** Cartas en el mazo (Taverna) y el cementerio. */
  tavernCount: number;
  discardCount: number;
  /** Carta superior del cementerio (boca arriba). */
  discardTopCard?: Card;
  /** Anclas para las animaciones de viaje (pilas mazo/cementerio). */
  deckRef?: Ref<HTMLDivElement>;
  discardRef?: Ref<HTMLDivElement>;
  /** Ancla para las animaciones de viaje (enemigo derrotado → cementerio). */
  ref?: Ref<HTMLDivElement>;
}

/** Número "−N" flotante sobre la carta cuando el enemigo recibe daño. */
function DamageFloat({ lastDamageDealt, turnNumber }: { lastDamageDealt: number; turnNumber: number }) {
  const [show, setShow] = useState<{ key: number; value: number } | null>(null);

  useEffect(() => {
    if (lastDamageDealt > 0) {
      setShow((prev) => ({ key: (prev?.key ?? 0) + 1, value: lastDamageDealt }));
    }
  }, [lastDamageDealt, turnNumber]);

  if (!show) return null;
  return (
    <motion.div
      key={show.key}
      className="damage-float"
      initial={{ opacity: 1, y: 0, scale: 1.3 }}
      animate={{ opacity: 0, y: -64, scale: 1 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
      onAnimationComplete={() => setShow(null)}
    >
      −{show.value}
    </motion.div>
  );
}

export function EnemyPanel({
  enemy,
  turnNumber,
  jestersLeft,
  lastDamageDealt,
  tavernCount,
  discardCount,
  discardTopCard,
  deckRef,
  discardRef,
  ref,
}: EnemyPanelProps) {
  const { t } = useLanguage();
  const remaining = enemy.maxHealth - enemy.damageTaken;
  const pct = Math.max(0, Math.min(100, (remaining / enemy.maxHealth) * 100));
  const attack = effectiveAttack(enemy);
  const suit = enemy.card.suit!;
  const barColor = pct > 60 ? '#7fd08a' : pct > 30 ? 'var(--gold)' : '#d15454';

  return (
    <div className="enemy-panel" ref={ref}>
      <div className="enemy-health-row">
        <span className="health-label">{t('life')}</span>
        <div className="health-bar">
          <div className="health-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="health-value">
          {remaining}/{enemy.maxHealth}
        </span>
      </div>

      <div className="enemy-card-row">
        <CardPile mode="deck" count={tavernCount} label={t('deck')} ref={deckRef} />

        <div className="enemy-card-wrap">
          <div className="enemy-card">
            <CardFace card={enemy.card} width={130} />
            {enemy.spadeShield > 0 && <span className="badge shield-badge">♠ {enemy.spadeShield}</span>}
          </div>
          <DamageFloat lastDamageDealt={lastDamageDealt} turnNumber={turnNumber} />
        </div>

        <CardPile mode="discard" count={discardCount} topCard={discardTopCard} label={t('discard')} ref={discardRef} />
      </div>

      <div className="enemy-name">
        {t(RANK_KEY[enemy.card.rank!]!)} de {t(SUIT_NAME_KEY[suit])}
      </div>

      <div className="stats-row">
        <span className="stat stat-attack">
          {t('attack')} <strong>{attack}</strong>
        </span>
        {enemy.spadeShield > 0 && (
          <span className="stat stat-shield">
            {t('shield')} <strong>♠ {enemy.spadeShield}</strong>
          </span>
        )}
        <span className="stat">{t('turnX', { n: turnNumber })}</span>
        <span className="stat">{t('jestersX', { n: jestersLeft })}</span>
      </div>

      <div className="immunity">
        {t('immuneTo', { symbol: SUIT_SYMBOL[suit], name: t(SUIT_NAME_KEY[suit]) })}
      </div>
    </div>
  );
}
