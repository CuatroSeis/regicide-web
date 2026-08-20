import { LOCALES, useLanguage } from './LanguageContext';
import type { Locale } from './LanguageContext';

/** Selector de idioma de la aplicación (es/en/pt). */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div className="lang-switcher" role="group" aria-label={t('langLabel')}>
      {LOCALES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`lang-button${option.id === locale ? ' lang-button--active' : ''}`}
          aria-pressed={option.id === locale}
          onClick={() => setLocale(option.id as Locale)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
