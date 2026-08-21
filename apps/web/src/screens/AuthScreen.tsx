import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { translateAuthError } from '../lib/authErrors';
import { isSupabaseConfigured } from '../lib/supabase';

type AuthTab = 'login' | 'register';

interface AuthScreenProps extends ScreenProps {
  onForgotPassword: () => void;
}

export function AuthScreen({ onNavigate, onForgotPassword }: AuthScreenProps) {
  const { t } = useLanguage();
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= 6 && (tab === 'login' || displayName.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const result =
      tab === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName);

    setSubmitting(false);

    if (result.error) {
      setError(translateAuthError(result.error, t));
      return;
    }

    if (tab === 'register') {
      setRegistered(true);
    } else {
      onNavigate('home');
    }
  }

  if (registered) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="verify-title">
        <div className="overlay-card">
          <div className="overlay-emoji">📧</div>
          <h2 className="overlay-title" id="verify-title">{t('authVerifyEmailTitle')}</h2>
          <p className="overlay-subtitle">
            {t('authVerifyEmailBody', { email })}
          </p>
          <div className="overlay-actions">
            <button
              type="button"
              className="menu-button"
              onClick={() => { setRegistered(false); setTab('login'); }}
            >
              {t('authVerifyEmailButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        REGICIDIO
      </h1>
      <p className="subtitle">{t('authSubtitle')}</p>

      <div className="auth-tabs" role="tablist" aria-label={t('authLogin')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'login'}
          className={tab === 'login' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => { setTab('login'); setError(null); }}
        >
          {t('authLogin')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'register'}
          className={tab === 'register' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => { setTab('register'); setError(null); }}
        >
          {t('authRegister')}
        </button>
      </div>

      <div className="form">
        {tab === 'register' && (
          <>
            <label htmlFor="auth-display-name">{t('authDisplayName')}</label>
            <input
              id="auth-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('authDisplayNamePlaceholder')}
              maxLength={20}
            />
          </>
        )}

        <label htmlFor="auth-email">{t('authEmail')}</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('authEmailPlaceholder')}
          autoComplete="email"
        />

        <label htmlFor="auth-password">{t('authPassword')}</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('authPasswordPlaceholder')}
          minLength={6}
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
        />
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <button
        type="button"
        className="menu-button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
      >
        {submitting
          ? t('connecting')
          : tab === 'login'
            ? t('authLoginButton')
            : t('authRegisterButton')}
      </button>

      {tab === 'login' && (
        <button type="button" className="back-button" onClick={onForgotPassword}>
          {t('authForgotPassword')}
        </button>
      )}

      {!isSupabaseConfigured() && (
        <div className="error-banner" role="alert">{t('authErrorNotConfigured')}</div>
      )}
    </div>
  );
}
