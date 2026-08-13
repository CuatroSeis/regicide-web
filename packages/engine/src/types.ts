export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export type NumericRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type FaceRank = 'A' | 'J' | 'Q' | 'K';
export type Rank = NumericRank | FaceRank;

export type CardKind = 'number' | 'ace' | 'enemy' | 'jester';

export interface Card {
  /** Identificador único por copia física de la carta. */
  readonly id: string;
  readonly kind: CardKind;
  /** null solo para el jester. */
  readonly rank: Rank | null;
  /** null solo para el jester. */
  readonly suit: Suit | null;
}

export interface Enemy {
  readonly card: Card;
  /** Valor base de ataque según [R-5]. */
  readonly attack: number;
  readonly maxHealth: number;
  damageTaken: number;
  /** Picas acumuladas contra este enemigo [R-14]; se resetea al derrotarlo. */
  spadeShield: number;
  /** Anulada por el jester [R-20]. */
  immunityNegated: boolean;
}

export interface Player {
  readonly id: string;
  readonly maxHandSize: number;
  hand: Card[];
}

export interface PlayedCard {
  readonly playerId: string;
  readonly card: Card;
}

export type Phase = 'choose_action' | 'suffer_damage' | 'game_over';

export type GameResult = 'victory' | 'defeat';

export interface GameState {
  readonly players: Player[];
  readonly currentPlayerIndex: number;
  /** Tope del mazo = último elemento. */
  castleDeck: Card[];
  /** Tope del mazo = último elemento. */
  tavernDeck: Card[];
  discardPile: Card[];
  /** Cartas jugadas contra el enemigo actual; van al descarte al derrotarlo [R-18(ii)]. */
  table: PlayedCard[];
  enemy: Enemy;
  phase: Phase;
  gameOver: boolean;
  result: GameResult | null;
  /** Rendimientos consecutivos de los últimos turnos [R-9]. */
  consecutiveYields: number;
  /** Jesters disponibles para el poder de solo [R-22]. */
  jestersLeft: number;
  /** Jesters usados (determina nivel de victoria [R-23]). */
  jestersUsed: number;
  turnNumber: number;
  log: string[];
}

export const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

export const NUMERIC_RANKS: readonly NumericRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
