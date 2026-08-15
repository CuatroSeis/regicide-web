import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLang } from '../test/renderWithLang';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('regicide.lang', 'es');
    document.documentElement.lang = 'es';
  });

  it('muestra las opciones del menú', () => {
    renderWithLang(<HomeScreen onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Iniciar partida/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear sala/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reglas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tabla de posiciones' })).toBeInTheDocument();
  });

  it('navega al hacer clic', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderWithLang(<HomeScreen onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Reglas' }));
    expect(onNavigate).toHaveBeenCalledWith('rules');
  });

  it('cambia de idioma con el selector y persiste', async () => {
    const user = userEvent.setup();
    renderWithLang(<HomeScreen onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('button', { name: /Start game/ })).toBeInTheDocument();
    expect(localStorage.getItem('regicide.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
