import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Card, PlayedCard } from '@regicide/engine';
import { CardFace } from './CardFace';

/** Datos mínimos del tablero necesarios para detectar movimientos de cartas. */
export interface CardTravelSnapshot {
  readonly hand: readonly Card[];
  readonly table: readonly PlayedCard[];
  readonly discardPile: readonly Card[];
  readonly tavernCount: number;
  readonly turnNumber: number;
}

/** Zonas del tablero usadas como origen/destino de los vuelos. */
export interface CardTravelZones {
  readonly deck: React.RefObject<HTMLElement | null>;
  readonly discard: React.RefObject<HTMLElement | null>;
  readonly hand: React.RefObject<HTMLElement | null>;
  readonly table: React.RefObject<HTMLElement | null>;
  readonly enemy: React.RefObject<HTMLElement | null>;
}

interface Travel {
  readonly key: string;
  readonly card: Card;
  readonly faceDown: boolean;
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  readonly rotation: number;
  readonly delay: number;
}

const TRAVEL_DURATION = 0.55;
const FACE_DOWN: Card = { id: '__dorso__', kind: 'number', rank: 2, suit: 'clubs' };

function zoneCenter(el: HTMLElement | null): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function rotation(): number {
  return Math.round(Math.random() * 24 - 12);
}

/**
 * Compara dos snapshots y genera los vuelos de cartas entre zonas:
 * mazo→mano (♦), mano→mesa (jugar), mesa/hand/enemigo→cementerio,
 * cementerio→mazo boca abajo (♥).
 */
function diffTravels(
  prev: CardTravelSnapshot,
  curr: CardTravelSnapshot,
  zones: CardTravelZones,
): Travel[] {
  const travels: Travel[] = [];
  const prevHand = new Set(prev.hand.map((c) => c.id));
  const prevTable = new Set(prev.table.map((p) => p.card.id));
  const prevDiscard = new Set(prev.discardPile.map((c) => c.id));
  const currHand = new Set(curr.hand.map((c) => c.id));
  const currTable = new Set(curr.table.map((p) => p.card.id));
  const currDiscard = new Set(curr.discardPile.map((c) => c.id));

  const deck = zoneCenter(zones.deck.current);
  const discard = zoneCenter(zones.discard.current);
  const hand = zoneCenter(zones.hand.current);
  const table = zoneCenter(zones.table.current);
  const enemy = zoneCenter(zones.enemy.current);

  // [R-12] ♦ Robar (y reparto inicial): mazo → mano propia.
  for (const card of curr.hand) {
    if (!prevHand.has(card.id)) {
      travels.push({
        key: `draw-${card.id}-${curr.turnNumber}`,
        card,
        faceDown: false,
        from: deck,
        to: hand,
        rotation: rotation(),
        delay: 0,
      });
    }
  }

  // Jugar cartas: mano → mesa (la mesa es pública para todos).
  for (const played of curr.table) {
    if (!prevTable.has(played.card.id)) {
      travels.push({
        key: `play-${played.card.id}-${curr.turnNumber}`,
        card: played.card,
        faceDown: false,
        from: hand,
        to: table,
        rotation: rotation(),
        delay: 0,
      });
    }
  }

  // [R-18](ii) mesa → cementerio, [R-19] mano → cementerio, enemigo derrotado → cementerio.
  for (const card of curr.discardPile) {
    if (prevDiscard.has(card.id)) continue;
    const from = prevTable.has(card.id) ? table : prevHand.has(card.id) ? hand : card.kind === 'enemy' ? enemy : null;
    if (!from) continue; // descarte de otro jugador (mano oculta)
    travels.push({
      key: `discard-${card.id}-${curr.turnNumber}`,
      card,
      faceDown: false,
      from,
      to: discard,
      rotation: rotation(),
      delay: 0,
    });
  }

  // [R-11] ♥ Recuperar: cartas que salen del cementerio → mazo (boca abajo).
  let stagger = 0;
  for (const card of prev.discardPile) {
    if (currDiscard.has(card.id) || currTable.has(card.id) || currHand.has(card.id)) continue;
    travels.push({
      key: `recover-${card.id}-${curr.turnNumber}`,
      card: FACE_DOWN,
      faceDown: true,
      from: discard,
      to: deck,
      rotation: 180,
      delay: stagger * 0.05,
    });
    stagger += 1;
  }

  return travels;
}

/**
 * Renderiza copias animadas de las cartas que cambiaron de zona entre el
 * snapshot anterior y el actual, volando de un punto del tablero a otro.
 */
export function CardTravel({ snapshot, zones }: { snapshot: CardTravelSnapshot; zones: CardTravelZones }) {
  const prevRef = useRef<CardTravelSnapshot | null>(null);
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const [travels, setTravels] = useState<Travel[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev) {
      const moves = diffTravels(prev, snapshot, zonesRef.current);
      if (moves.length > 0) {
        setTravels((current) => [...current, ...moves]);
      }
    }
    prevRef.current = snapshot;
  }, [snapshot]);

  const remove = (key: string): void => setTravels((current) => current.filter((t) => t.key !== key));

  return (
    <>
      {travels.map((t) => (
        <motion.div
          key={t.key}
          className="card-travel"
          style={{ left: t.from.x, top: t.from.y }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: t.rotation }}
          animate={{ x: t.to.x - t.from.x, y: t.to.y - t.from.y, opacity: 0.9, scale: 0.55 }}
          transition={{ duration: TRAVEL_DURATION, delay: t.delay, ease: 'easeInOut' }}
          onAnimationComplete={() => remove(t.key)}
        >
          <CardFace card={t.card} width={52} facedown={t.faceDown} />
        </motion.div>
      ))}
    </>
  );
}
