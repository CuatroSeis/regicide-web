import type { Card } from '@regicide/engine';
import { CardFace } from './CardFace';

/** Fantasma flotante con las cartas arrastradas siguiendo al puntero. */
export function CardDragGhost({
  cards,
  width,
  x,
  y,
}: {
  cards: Card[];
  width: number;
  x: number;
  y: number;
}) {
  if (cards.length === 0) return null;
  const n = cards.length;
  return (
    <div
      className="drag-ghost"
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${x - width / 2}px, ${y - width * 1.35}px)`,
        pointerEvents: 'none',
        zIndex: 999,
        display: 'flex',
        gap: 6,
      }}
    >
      {cards.map((card, i) => (
        <div
          key={card.id}
          style={{
            transform: `rotate(${(i - (n - 1) / 2) * 6}deg) translateY(${Math.abs(i - (n - 1) / 2) * -10}px)`,
          }}
        >
          <CardFace card={card} width={width} />
        </div>
      ))}
    </div>
  );
}
