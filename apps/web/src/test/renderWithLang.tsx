import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { LanguageProvider } from '../i18n/LanguageContext';

/** Renderiza dentro de <LanguageProvider> (los componentes usan useLanguage). */
export function renderWithLang(ui: ReactElement) {
  return render(<LanguageProvider>{ui as ReactNode}</LanguageProvider>);
}
