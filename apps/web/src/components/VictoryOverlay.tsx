import type { SoloRank } from '@regicide/engine';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

interface VictoryOverlayProps {
  victory: boolean;
  victoryLevel: 'gold' | 'silver' | 'bronze' | null;
  /** Rango final de la partida (solo); null en multijugador. */
  rank?: SoloRank | null;
  onNewGame: () => void;
  onHome: () => void;
  onViewLeaderboard?: () => void;
}

const MEDAL: Record<'gold' | 'silver' | 'bronze', { emoji: string; label: TranslationKey }> = {
  gold: { emoji: '🥇', label: 'victoryGold' },
  silver: { emoji: '🥈', label: 'victorySilver' },
  bronze: { emoji: '🥉', label: 'victoryBronze' },
};

const RANK_LABEL: Record<SoloRank, TranslationKey> = {
  gold: 'rankGold',
  silver: 'rankSilver',
  bronze: 'rankBronze',
  baron: 'rankBaron',
  knight: 'rankKnight',
  squire: 'rankSquire',
  peasant: 'rankPeasant',
};

export function VictoryOverlay({
  victory,
  victoryLevel,
  rank,
  onNewGame,
  onHome,
  onViewLeaderboard,
}: VictoryOverlayProps) {
  const { t } = useLanguage();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <div className="overlay-card">
        {victory ? (
          <>
            <div className="overlay-emoji">
              {victoryLevel ? MEDAL[victoryLevel].emoji : '👑'}
            </div>
            <h2 className="overlay-title" id="overlay-title">
              {victoryLevel ? t(MEDAL[victoryLevel].label) : t('victory')}
            </h2>
            <p className="overlay-subtitle">{t('victorySubtitle')}</p>
          </>
        ) : (
          <>
            <div className="overlay-emoji">💀</div>
            <h2 className="overlay-title" id="overlay-title">
              {t('defeat')}
            </h2>
            <p className="overlay-subtitle">{t('defeatSubtitle')}</p>
          </>
        )}
        {rank && <p className="overlay-rank">{t('finalRank', { rank: t(RANK_LABEL[rank]) })}</p>}
        <div className="overlay-actions">
          <button type="button" className="menu-button" onClick={onNewGame}>
            {t('playAgain')}
          </button>
          {onViewLeaderboard && (
            <button type="button" className="menu-button" onClick={onViewLeaderboard}>
              {t('viewLeaderboard')}
            </button>
          )}
          <button type="button" className="back-button" onClick={onHome}>
            {t('backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}
