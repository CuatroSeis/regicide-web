import type { ScreenProps } from '../navigation';
import { useLanguage } from '../i18n/LanguageContext';

const STEP_KEYS = ['rulesStep1', 'rulesStep2', 'rulesStep3', 'rulesStep4'] as const;

export function RulesScreen({ onNavigate }: ScreenProps) {
  const { t } = useLanguage();
  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        {t('rulesTitle')}
      </h1>
      <div className="rules-panel">
        <h2>{t('rulesTurn')}</h2>
        <ul>
          {STEP_KEYS.map((key) => (
            <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
          ))}
        </ul>

        <h2>{t('rulesCombos')}</h2>
        <ul>
          <li>{t('rulesCombo1')}</li>
          <li>{t('rulesCombo2')}</li>
        </ul>

        <h2>{t('rulesSuits')}</h2>
        <ul>
          <li dangerouslySetInnerHTML={{ __html: t('rulesSuitHearts') }} />
          <li dangerouslySetInnerHTML={{ __html: t('rulesSuitDiamonds') }} />
          <li dangerouslySetInnerHTML={{ __html: t('rulesSuitClubs') }} />
          <li dangerouslySetInnerHTML={{ __html: t('rulesSuitSpades') }} />
        </ul>

        <h2>{t('rulesEnemies')}</h2>
        <ul>
          <li>{t('rulesEnemy1')}</li>
          <li>{t('rulesEnemy2')}</li>
          <li>{t('rulesEnemy3')}</li>
        </ul>

        <h2>{t('rulesSolo')}</h2>
        <ul>
          <li>{t('rulesSolo1')}</li>
          <li>{t('rulesSolo2')}</li>
          <li>{t('rulesSolo3')}</li>
        </ul>
      </div>
      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        {t('back')}
      </button>
      <p className="credits">{t('rulesCredits')}</p>
    </div>
  );
}
