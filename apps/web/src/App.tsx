import type { Card } from '@regicide/engine';
import { CardFace } from './components/CardFace';

const demoCards: Card[] = [
  { id: 'demo-club-2', kind: 'number', rank: 2, suit: 'clubs' },
  { id: 'demo-heart-7', kind: 'number', rank: 7, suit: 'hearts' },
  { id: 'demo-ace-spades', kind: 'ace', rank: 'A', suit: 'spades' },
  { id: 'demo-jack-diamonds', kind: 'enemy', rank: 'J', suit: 'diamonds' },
  { id: 'demo-queen-hearts', kind: 'enemy', rank: 'Q', suit: 'hearts' },
  { id: 'demo-king-clubs', kind: 'enemy', rank: 'K', suit: 'clubs' },
  { id: 'demo-jester', kind: 'jester', rank: null, suit: null },
];

export function App() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Regicide — modo solo</h1>
      <p>Verificación de assets SVG (htdebeer/SVG-cards, LGPL-2.1):</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {demoCards.map((card) => (
          <CardFace key={card.id} card={card} width={80} />
        ))}
        <CardFace card={demoCards[0]!} width={80} facedown />
      </div>
    </main>
  );
}
