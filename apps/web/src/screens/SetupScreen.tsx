import { useState } from 'react';
import type { ScreenProps } from '../navigation';
import { useLanguage } from '../i18n/LanguageContext';

const NAME_KEY = 'regicide.name';

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

export function rememberName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function rememberedName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

/** Nombre + semilla de la partida 1p (la semilla identifica la partida en la tabla). */
export function SetupScreen({ onStart, onNavigate }: SetupScreenProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(rememberedName);
  const ready = name.trim().length > 0;

  return (
    <div className="screen">
      <h1 className="title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
        {t('setupTitle')}
      </h1>
      <p className="subtitle">{t('setupSubtitle')}</p>

      <div className="form">
        <label htmlFor="solo-name">{t('setupNameLabel')}</label>
        <input
          id="solo-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('setupNamePlaceholder')}
          maxLength={20}
          autoFocus
        />
      </div>

      <button
        type="button"
        className="menu-button"
        disabled={!ready}
        onClick={() => {
          const clean = name.trim();
          rememberName(clean);
          onStart({ name: clean, seed: randomSeed() });
        }}
      >
        {t('setupStart')}
      </button>

      <button type="button" className="back-button" onClick={() => onNavigate('home')}>
        {t('backToMenu')}
      </button>
    </div>
  );
}
