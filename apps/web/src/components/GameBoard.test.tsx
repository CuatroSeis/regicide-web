import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card, Enemy, PlayedCard } from '@regicide/engine';
import { renderWithLang } from '../test/renderWithLang';
import { GameBoard } from './GameBoard';

const card = (id: string): Card => ({ id, kind: 'number', rank: 5, suit: 'hearts' });
const enemy: Enemy = {
  card: { id: 'e1', kind: 'enemy', rank: 'Q', suit: 'hearts' },
  attack: 10,
  maxHealth: 30,
  damageTaken: 0,
  spadeShield: 0,
  immunityNegated: false,
};
const hand: Card[] = [card('c1'), card('c2'), card('c3')];
const table: PlayedCard[] = [
  { playerId: 'p1', card: card('t1') },
  { playerId: 'p1', card: card('t2') },
  { playerId: 'p2', card: card('t3') },
];

function baseProps() {
  return {
    phase: 'choose_action' as const,
    hand,
    maxHandSize: 8,
    table,
    discardPile: [],
    tavernCount: 40,
    castleCount: 12,
    enemy,
    turnNumber: 3,
    jestersLeft: 2,
    lastDamageDealt: 0,
    log: [],
    banner: null,
    selectedIds: [],
    isMyTurn: true,
    canPlay: true,
    canYieldNow: true,
    showJester: false,
    headerMeta: 'Sala ABCD',
    onMenu: vi.fn(),
    onToggleCard: vi.fn(),
    onClearSelection: vi.fn(),
    onPlay: vi.fn(),
    onYieldTurn: vi.fn(),
    onDiscard: vi.fn(),
    onJester: vi.fn(),
  };
}

describe('GameBoard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('regicide.lang', 'es');
  });

  it('renderiza el shell completo con contadores y controles activos', () => {
    renderWithLang(<GameBoard {...baseProps()} />);
    const castleChip = screen.getByText('Castillo').closest('.deck-chip');
    expect(castleChip).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: 'Jugar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Rendirse' })).toBeEnabled();
    expect(screen.getByText('Mano (3/8)')).toBeInTheDocument();
    expect(screen.getByText('Sala ABCD')).toBeInTheDocument();
  });

  it('oculta Jugar/Rendirse cuando no es mi turno (online)', () => {
    renderWithLang(<GameBoard {...baseProps()} isMyTurn={false} />);
    expect(screen.queryByRole('button', { name: 'Jugar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rendirse' })).not.toBeInTheDocument();
  });

  it('en suffer_damage muestra Cubrir daño en vez de Jugar', () => {
    renderWithLang(
      <GameBoard {...baseProps()} phase="suffer_damage" canPlay={false} canYieldNow={false} />,
    );
    expect(screen.getByRole('button', { name: 'Cubrir daño' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jugar' })).not.toBeInTheDocument();
  });

  it('muestra el botón Jester con su contador cuando corresponde', () => {
    renderWithLang(<GameBoard {...baseProps()} showJester jesterCount={2} />);
    const jester = screen.getByRole('button', { name: 'Jester (2)' });
    expect(jester).toBeInTheDocument();
  });

  it('sin contador de jester (online) el botón no lleva "(N)"', () => {
    renderWithLang(<GameBoard {...baseProps()} showJester />);
    expect(screen.getByRole('button', { name: 'Jester' })).toBeInTheDocument();
  });

  it('muestra el banner de error cuando hay mensaje', () => {
    renderWithLang(<GameBoard {...baseProps()} error="No podés jugar ahora" />);
    expect(screen.getByText('No podés jugar ahora')).toBeInTheDocument();
  });

  it('agrupa las cartas de la mesa por jugador con chip de autoría', () => {
    renderWithLang(<GameBoard {...baseProps()} playerNameById={{ p1: 'Ana', p2: 'Beto' }} />);
    const owners = screen.getAllByText(/^(Ana|Beto)$/);
    expect(owners).toHaveLength(2);
    expect(owners[0]).toHaveTextContent('Ana');
    expect(owners[1]).toHaveTextContent('Beto');
  });

  it('sin playerNameById (solitario) la mesa no muestra chips de autoría', () => {
    const { container } = renderWithLang(<GameBoard {...baseProps()} />);
    expect(container.querySelectorAll('.table-group-owner')).toHaveLength(0);
    expect(container.querySelectorAll('.table-group')).toHaveLength(2);
  });
});
