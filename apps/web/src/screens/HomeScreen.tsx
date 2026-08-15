import type { Card } from '@regicide/engine';
import type { Screen, ScreenProps } from '../navigation';
import { CardFan } from '../components/CardFan';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

const fanCards: Card[] = [
  { id: 'menu-king-spades', kind: 'enemy', rank: 'K', suit: 'spades' },
  { id: 'menu-queen-hearts', kind: 'enemy', rank: 'Q', suit: 'hearts' },
  { id: 'menu-jack-clubs', kind: 'enemy', rank: 'J', suit: 'clubs' },
  { id: 'menu-joker', kind: 'jester', rank: null, suit: null },
];

interface MenuOption {
  id: Screen;
  label: string;
  hint?: string;
}

export function HomeScreen({ onNavigate }: ScreenProps) {
  const { t } = useLanguage();
  const MENU_OPTIONS: MenuOption[] = [
    { id: 'setup', label: t('menuSolo') },
    { id: 'room', label: t('menuOnline'), hint: t('menuOnlineHint') },
    { id: 'rules', label: t('menuRules') },
    { id: 'leaderboard', label: t('menuLeaderboard') },
  ];

  return (
    <div className="screen">
      <LanguageSwitcher />
      <h1 className="title">REGICIDIO</h1>
      <p className="subtitle">{t('homeSubtitle')}</p>

      <CardFan cards={fanCards} />

      <ul className="menu">
        {MENU_OPTIONS.map((option) => (
          <li key={option.id} style={{ listStyle: 'none' }}>
            <button
              type="button"
              className="menu-button"
              onClick={() => onNavigate(option.id)}
            >
              {option.label}
              {option.hint && <span className="hint">{option.hint}</span>}
            </button>
          </li>
        ))}
      </ul>

      <p className="credits">{t('homeCredits')}</p>
    </div>
  );
}
