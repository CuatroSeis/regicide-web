import type { ScreenProps } from '../navigation';
import { useAuth, displayName } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

export interface SoloSetup {
  name: string;
  seed: number;
}

interface SetupScreenProps extends ScreenProps {
  onStart: (setup: SoloSetup) => void;
}

function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Nombre + semilla de la partida 1p (la semilla identifica la partida en la tabla). */
export function SetupScreen({ onStart, onNavigate }: SetupScreenProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const name = displayName(user);
  const seed = randomSeed();

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        {t('setupTitle')}
      </h1>
      <p className="subtitle">{t('setupSubtitle')}</p>

      <p className="muted" style={{ marginBottom: '1rem' }}>
        {t('authLoggedAs', { name })}
      </p>

      <button
        type="button"
        className="menu-button"
        onClick={() => onStart({ name, seed })}
      >
        {t('setupStart')}
      </button>

      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        {t('backToMenu')}
      </button>
    </div>
  );
}
