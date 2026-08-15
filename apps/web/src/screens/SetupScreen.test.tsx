import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLang } from '../test/renderWithLang';
import { SetupScreen } from './SetupScreen';

describe('SetupScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('regicide.lang', 'es');
  });

  it('deshabilita Jugar sin nombre', () => {
    renderWithLang(<SetupScreen onStart={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeDisabled();
  });

  it('llama a onStart con nombre y semilla numérica', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    renderWithLang(<SetupScreen onStart={onStart} onNavigate={vi.fn()} />);
    await user.type(screen.getByLabelText('Tu nombre'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Jugar' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const [setup] = onStart.mock.calls[0]!;
    expect(setup.name).toBe('Ana');
    expect(typeof setup.seed).toBe('number');
    expect(setup.seed).toBeGreaterThanOrEqual(0);
    expect(setup.seed).toBeLessThanOrEqual(0xffffffff);
    expect(localStorage.getItem('regicide.name')).toBe('Ana');
  });

  it('precarga el nombre guardado', () => {
    localStorage.setItem('regicide.name', 'Leo');
    renderWithLang(<SetupScreen onStart={vi.fn()} onNavigate={vi.fn()} />);
    expect((screen.getByLabelText('Tu nombre') as HTMLInputElement).value).toBe('Leo');
  });

  it('vuelve al menú', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderWithLang(<SetupScreen onStart={vi.fn()} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: '← Volver al menú' }));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });
});
