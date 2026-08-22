import { useLanguage } from '../i18n/LanguageContext';

export interface RivalInfo {
  id: string;
  name: string;
  /** Cartas restantes en la mano del rival. */
  handCount: number;
  connected: boolean;
  /** true si es el turno activo de este rival. */
  isCurrent: boolean;
}

interface RivalsPanelProps {
  rivals: RivalInfo[];
}

/**
 * Chips compactos con los rivales humanos durante la partida online:
 * nombre, cartas restantes, conexión y resaltado del turno activo.
 * Vive en el slot derecho del header (costo vertical cero).
 */
export function RivalsPanel({ rivals }: RivalsPanelProps) {
  const { t } = useLanguage();
  if (rivals.length === 0) return null;

  return (
    <div className="rivals">
      {rivals.map((rival) => (
        <span
          key={rival.id}
          className={
            rival.isCurrent ? 'rival-chip rival-chip--current' : 'rival-chip'
          }
          title={`${rival.name}: ${t('hand', { hand: rival.handCount, max: rival.handCount })}`}
          aria-label={t('rivalChipAria', {
            name: rival.name,
            cards: rival.handCount,
            status: rival.connected ? t('connected') : t('disconnected'),
          })}
        >
          <span
            className={rival.connected ? 'rival-dot conn-on' : 'rival-dot'}
            aria-hidden="true"
          />
          <span className="rival-name">{rival.name}</span>
          <strong className="rival-count">{rival.handCount}</strong>
        </span>
      ))}
    </div>
  );
}
