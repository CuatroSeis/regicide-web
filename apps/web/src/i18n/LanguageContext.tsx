import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LOCALES, interpolate, translations } from './translations';
import type { Locale, TranslationKey } from './translations';

const STORAGE_KEY = 'regicide.lang';

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Traduce una clave con interpolación opcional {param}. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en' || stored === 'pt') return stored;
  const browser = navigator.language.toLowerCase();
  if (browser.startsWith('pt')) return 'pt';
  if (browser.startsWith('es')) return 'es';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(translations[locale][key], params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage debe usarse dentro de <LanguageProvider>');
  return ctx;
}

export { LOCALES };
export type { Locale };
