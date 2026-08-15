import { Component } from 'react';
import type { ReactNode } from 'react';
import { LanguageContext } from '../i18n/LanguageContext';
import type { LanguageContextValue } from '../i18n/LanguageContext';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static override contextType = LanguageContext;
  declare context: LanguageContextValue;

  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override render() {
    if (this.state.error) {
      const { t } = this.context;
      return (
        <div className="screen game-screen">
          <p className="muted">{t('errorUi')}</p>
          <button type="button" className="menu-button" onClick={() => window.location.reload()}>
            {t('reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
