import { useEffect, useState } from 'react';
import type { SoloRank, Suit } from '@regicide/engine';
import type { ScreenProps } from '../navigation';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { fetchLeaderboard } from '../lib/leaderboard';
import type { LeaderboardEntry } from '../lib/leaderboard';

const RANK_KEY: Record<SoloRank, TranslationKey> = {
  gold: 'rankGold',
  silver: 'rankSilver',
  bronze: 'rankBronze',
  baron: 'rankBaron',
  knight: 'rankKnight',
  squire: 'rankSquire',
  peasant: 'rankPeasant',
};

const RANK_NAME_KEY: Record<'J' | 'Q' | 'K', TranslationKey> = {
  J: 'rankJ',
  Q: 'rankQ',
  K: 'rankK',
};

const SUIT_NAME_KEY: Record<Suit, TranslationKey> = {
  hearts: 'suitHearts',
  diamonds: 'suitDiamonds',
  clubs: 'suitClubs',
  spades: 'suitSpades',
};

function whereDied(
  entry: LeaderboardEntry,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (entry.result === 'victory' || entry.enemyCard === null) {
    return t('victoryText', { n: entry.enemiesDefeated });
  }
  const card = entry.enemyCard;
  const enemy =
    card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'
      ? `${t(RANK_NAME_KEY[card.rank])} de ${t(SUIT_NAME_KEY[card.suit!])}`
      : String(card.rank);
  return t('diedAgainst', { enemy, n: entry.enemiesDefeated });
}

export function LeaderboardScreen({ onNavigate }: ScreenProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((list) => alive && setEntries(list))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        {t('leaderboardTitle')}
      </h1>

      {error && <div className="error-banner">{t('errorLeaderboard')}</div>}

      {entries === null && !error ? (
        <p className="muted">{t('loadingLeaderboard')}</p>
      ) : entries !== null && entries.length === 0 ? (
        <p className="muted">{t('emptyLeaderboard')}</p>
      ) : (
        entries !== null && (
          <table className="leaderboard">
            <thead>
              <tr>
                <th scope="col">{t('colName')}</th>
                <th scope="col">{t('colWhere')}</th>
                <th scope="col">{t('colJesters')}</th>
                <th scope="col">{t('colRank')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.seed}>
                  <td data-label={t('colName')}>{entry.name}</td>
                  <td data-label={t('colWhere')}>{whereDied(entry, t)}</td>
                  <td data-label={t('colJesters')}>{entry.jestersUsed}</td>
                  <td data-label={t('colRank')}>{t(RANK_KEY[entry.rank])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        {t('backToMenu')}
      </button>
    </div>
  );
}
