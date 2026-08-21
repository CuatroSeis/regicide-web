import type { LogEntry, LogKey } from '@regicide/engine';
import type { TranslationKey } from '../i18n/translations';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** LogKey del engine → clave i18n. */
const LOG_TRANSLATION_KEYS: Record<LogKey, TranslationKey> = {
  game_start: 'logGameStart',
  play_cards: 'logPlayCards',
  yield: 'logYield',
  cover_fail_defeat: 'logCoverFailDefeat',
  stuck_defeat: 'logStuckDefeat',
  jester_solo: 'logJesterSolo',
  jester_multi: 'logJesterMulti',
};

/** Traduce una entrada estructurada del log al idioma activo. */
export function formatLogEntry(entry: LogEntry, t: Translate): string {
  return t(LOG_TRANSLATION_KEYS[entry.key], entry.args as Record<string, string | number> | undefined);
}
