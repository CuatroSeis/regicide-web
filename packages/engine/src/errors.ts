/**
 * Error con código estable para la capa de red: el server lo reenvía al
 * cliente y la UI lo traduce según el idioma activo. El `message` en español
 * queda como fallback para logs y desarrollo.
 */
export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

export type GameErrorCode =
  // selección y jugadas
  | 'empty_selection'
  | 'duplicate_card'
  | 'card_not_in_hand'
  | 'jester_not_attack'
  | 'invalid_play'
  | 'game_over'
  | 'wrong_phase_play'
  // rendirse [R-9]
  | 'wrong_phase_yield'
  | 'yield_blocked_all'
  // cubrir daño / descarte [R-19]
  | 'wrong_phase_cover'
  // Jester
  | 'jester_solo_single_only'
  | 'jester_wrong_phase'
  | 'no_jesters_left'
  | 'jester_multi_only'
  | 'no_jester_in_hand'
  | 'invalid_target'
  | 'jester_self_target'
  // salas (server)
  | 'too_many_rooms'
  | 'room_not_found'
  | 'room_full'
  | 'room_already_started'
  | 'room_not_started'
  | 'not_in_room'
  | 'active_connection'
  | 'host_only'
  | 'need_two_players'
  | 'players_disconnected'
  | 'game_not_initialized'
  | 'not_your_turn'
  | 'unknown_target';
