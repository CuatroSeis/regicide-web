import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLang } from '../test/renderWithLang';
import { LeaderboardScreen } from './LeaderboardScreen';

const ENTRIES = [
  {
    name: 'Ana',
    seed: 42,
    result: 'victory',
    rank: 'gold',
    enemiesDefeated: 12,
    enemyCard: null,
    jestersUsed: 0,
    turnNumber: 24,
    createdAt: 1,
  },
  {
    name: 'Leo',
    seed: 7,
    result: 'defeat',
    rank: 'baron',
    enemiesDefeated: 9,
    enemyCard: { id: 'e1', kind: 'enemy', rank: 'K', suit: 'spades' },
    jestersUsed: 2,
    turnNumber: 31,
    createdAt: 2,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    localStorage.setItem('regicide.lang', 'es');
  });

  it('muestra las columnas y las entradas (victoria y derrota)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: ENTRIES }) }));
    renderWithLang(<LeaderboardScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    expect(screen.getByText('Leo')).toBeInTheDocument();
    expect(screen.getByText('Oro')).toBeInTheDocument();
    expect(screen.getByText('Barón')).toBeInTheDocument();
    expect(screen.getByText('Victoria · 12/12')).toBeInTheDocument();
    expect(screen.getByText('Rey de Picas · 9/12')).toBeInTheDocument();
  });

  it('muestra el estado vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) }));
    renderWithLang(<LeaderboardScreen onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Todavía no hay partidas registradas/)).toBeInTheDocument(),
    );
  });

  it('muestra error si falla el fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderWithLang(<LeaderboardScreen onNavigate={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/No se pudo cargar la tabla/)).toBeInTheDocument(),
    );
  });
});
