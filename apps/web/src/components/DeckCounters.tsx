import type { Ref } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface DeckChipProps {
  label: string;
  value: number;
  /** Ancla para las animaciones de viaje de cartas (mazo / cementerio). */
  ref?: Ref<HTMLSpanElement>;
}

/** Chip con la cantidad de cartas de una zona (Taverna, Castillo, Cementerio). */
export function DeckChip({ label, value, ref }: DeckChipProps) {
  return (
    <span className="deck-chip" ref={ref}>
      {label} <strong>{value}</strong>
    </span>
  );
}

interface DeckCountersProps {
  tavern: number;
  castle: number;
  discard: number;
  tavernRef?: Ref<HTMLSpanElement>;
  castleRef?: Ref<HTMLSpanElement>;
  discardRef?: Ref<HTMLSpanElement>;
}

/** Fila de contadores Mazo / Castillo / Cementerio (layout en header o propia). */
export function DeckCounters({ tavern, castle, discard, tavernRef, castleRef, discardRef }: DeckCountersProps) {
  const { t } = useLanguage();
  return (
    <div className="deck-chips">
      <DeckChip label={t('deck')} value={tavern} ref={tavernRef} />
      <DeckChip label={t('castle')} value={castle} ref={castleRef} />
      <DeckChip label={t('discard')} value={discard} ref={discardRef} />
    </div>
  );
}
