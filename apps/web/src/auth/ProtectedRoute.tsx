import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="screen">
        <p className="subtitle">{t('connecting')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
