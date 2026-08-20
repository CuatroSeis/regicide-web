import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';

/** Renderiza dentro de <AuthProvider> + <LanguageProvider>. */
export function renderWithLang(ui: ReactElement) {
  return render(
    <AuthProvider>
      <LanguageProvider>{ui as ReactNode}</LanguageProvider>
    </AuthProvider>,
  );
}
