import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

interface ForgotPasswordScreenProps extends ScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const { t } = useLanguage();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);
    const result = await resetPassword(email.trim());
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
        {t('authForgotTitle')}
      </h1>

      {sent ? (
        <p className="subtitle">{t('authForgotSent')}</p>
      ) : (
        <>
          <p className="subtitle">{t('authForgotSubtitle')}</p>

          <div className="form">
            <label htmlFor="forgot-email">{t('authEmail')}</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('authEmailPlaceholder')}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button
            type="button"
            className="menu-button"
            disabled={!email.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? t('connecting') : t('authForgotButton')}
          </button>
        </>
      )}

      <button type="button" className="back-button" onClick={onBack}>
        {t('back')}
      </button>
    </div>
  );
}
