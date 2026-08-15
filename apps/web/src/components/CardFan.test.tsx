import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '@regicide/engine';
import { renderWithLang } from '../test/renderWithLang';
import { CardFan } from './CardFan';

const hand: Card[] = [
  { id: 'c1', kind: 'number', rank: 4, suit: 'hearts' },
  { id: 'c2', kind: 'number', rank: 7, suit: 'clubs' },
  { id: 'c3', kind: 'enemy', rank: 'J', suit: 'spades' },
];

describe('CardFan (accesibilidad)', () => {
  it('en modo selección cada carta es un botón con aria-pressed', () => {
    renderWithLang(<CardFan cards={hand} onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(hand.length);
    for (const button of buttons) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('sin onSelect las cartas no son focuseables', () => {
    renderWithLang(<CardFan cards={hand} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]!).toHaveAttribute('aria-disabled', 'true');
    expect(buttons[0]!).toHaveAttribute('tabindex', '-1');
  });

  it('marca aria-pressed=true en las cartas seleccionadas', () => {
    renderWithLang(<CardFan cards={hand} selectedIds={['c2']} onSelect={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]!).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]!).toHaveAttribute('aria-pressed', 'false');
  });

  it('llama a onSelect con el id al hacer clic (también con teclado)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithLang(<CardFan cards={hand} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');

    await user.click(buttons[0]!);
    expect(onSelect).toHaveBeenCalledWith('c1');

    buttons[1]!.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('c2');
  });
});
