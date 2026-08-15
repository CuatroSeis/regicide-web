import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppWithMotion } from './App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LanguageProvider } from './i18n/LanguageContext.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ErrorBoundary>
        <AppWithMotion />
      </ErrorBoundary>
    </LanguageProvider>
  </StrictMode>,
);
