import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithLang } from '../test/renderWithLang';
import { RivalsPanel } from './RivalsPanel';

const rivals = [
  { id: 'p2', name: 'Ana', handCount: 4, connected: true, isCurrent: true },
  { id: 'p3', name: 'Beto', handCount: 2, connected: false, isCurrent: false },
];

describe('RivalsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('regicide.lang', 'es');
  });

  it('muestra un chip por rival con su nombre y cartas restantes', () => {
    renderWithLang(<RivalsPanel rivals={rivals} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('resalta el chip del rival con turno activo', () => {
    const { container } = renderWithLang(<RivalsPanel rivals={rivals} />);
    const chips = container.querySelectorAll('.rival-chip');
    expect(chips[0]).toHaveClass('rival-chip--current');
    expect(chips[1]).not.toHaveClass('rival-chip--current');
  });

  it('marca la conexión de cada rival con el punto de estado', () => {
    const { container } = renderWithLang(<RivalsPanel rivals={rivals} />);
    const dots = container.querySelectorAll('.rival-dot');
    expect(dots[0]).toHaveClass('conn-on');
    expect(dots[1]).not.toHaveClass('conn-on');
  });

  it('expone un aria-label con nombre, cartas y estado', () => {
    renderWithLang(<RivalsPanel rivals={rivals} />);
    expect(screen.getByLabelText('Ana: 4 cartas en la mano, conectado')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Beto: 2 cartas en la mano, desconectado'),
    ).toBeInTheDocument();
  });

  it('no renderiza nada sin rivales', () => {
    const { container } = renderWithLang(<RivalsPanel rivals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
