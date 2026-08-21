import type { GameErrorCode } from '@regicide/engine';
import type { TranslationKey } from '../i18n/translations';

type Translate = (key: TranslationKey) => string;

/** GameErrorCode del server → clave i18n. */
const ACK_TRANSLATION_KEYS: Record<GameErrorCode, TranslationKey> = {
  empty_selection: 'errEmptySelection',
  duplicate_card: 'errDuplicateCard',
  card_not_in_hand: 'errCardNotInHand',
  jester_not_attack: 'errJesterNotAttack',
  invalid_play: 'errInvalidPlay',
  game_over: 'errGameOver',
  wrong_phase_play: 'errWrongPhasePlay',
  wrong_phase_yield: 'errWrongPhaseYield',
  yield_blocked_all: 'errYieldBlockedAll',
  wrong_phase_cover: 'errWrongPhaseCover',
  jester_solo_single_only: 'errJesterSoloSingleOnly',
  jester_wrong_phase: 'errJesterWrongPhase',
  no_jesters_left: 'errNoJestersLeft',
  jester_multi_only: 'errJesterMultiOnly',
  no_jester_in_hand: 'errNoJesterInHand',
  invalid_target: 'errInvalidTarget',
  jester_self_target: 'errJesterSelfTarget',
  too_many_rooms: 'errTooManyRooms',
  room_not_found: 'errRoomNotFound',
  room_full: 'errRoomFull',
  room_already_started: 'errRoomAlreadyStarted',
  room_not_started: 'errRoomNotStarted',
  not_in_room: 'errNotInRoom',
  active_connection: 'errActiveConnection',
  host_only: 'errHostOnly',
  need_two_players: 'errNeedTwoPlayers',
  players_disconnected: 'errPlayersDisconnected',
  game_not_initialized: 'errGameNotInitialized',
  not_your_turn: 'errNotYourTurn',
  unknown_target: 'errUnknownTarget',
};

/** Mensaje de un ack traducido; cae al texto crudo si el código es desconocido. */
export function ackErrorMessage(
  ack: { error?: string; errorCode?: GameErrorCode },
  t: Translate,
): string {
  if (ack.errorCode && ack.errorCode in ACK_TRANSLATION_KEYS) {
    return t(ACK_TRANSLATION_KEYS[ack.errorCode]);
  }
  return ack.error ?? '';
}
