import type { Card } from '@regicide/engine';
import type { Screen, ScreenProps } from '../navigation';
import { CardFan } from '../components/CardFan';

const fanCards: Card[] = [
  { id: 'menu-king-spades', kind: 'enemy', rank: 'K', suit: 'spades' },
  { id: 'menu-queen-hearts', kind: 'enemy', rank: 'Q', suit: 'hearts' },
  { id: 'menu-jack-clubs', kind: 'enemy', rank: 'J', suit: 'clubs' },
  { id: 'menu-joker', kind: 'jester', rank: null, suit: null },
];

interface MenuOption {
  id: Screen;
  label: string;
  hint?: string;
}

const MENU_OPTIONS: MenuOption[] = [
  { id: 'game', label: 'Iniciar partida (1p)' },
  { id: 'room', label: 'Crear sala (2+ p)', hint: 'Próximamente: multijugador online' },
  { id: 'rules', label: 'Reglas' },
];

export function HomeScreen({ onNavigate }: ScreenProps) {
  return (
    <div className="screen">
      <h1 className="title">REGICIDIO</h1>
      <p className="subtitle">Fan-made · Juego de cartas cooperativo</p>

      <CardFan cards={fanCards} />

      <ul className="menu">
        {MENU_OPTIONS.map((option) => (
          <li key={option.id} style={{ listStyle: 'none' }}>
            <button
              type="button"
              className="menu-button"
              disabled={option.id === 'room'}
              onClick={() => onNavigate(option.id)}
            >
              {option.label}
              {option.hint && <span className="hint">{option.hint}</span>}
            </button>
          </li>
        ))}
      </ul>

      <p className="credits">
        Proyecto fan-made sin fines de lucro, sin afiliación con Badgers From Mars. Regicide es de
        Paul Abrahams, Luke Badger y Andy Richdale. Cartas: htdebeer/SVG-cards (LGPL-2.1) por
        David Bellot.
      </p>
    </div>
  );
}
