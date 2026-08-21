import type { TranslationKey } from '../i18n/translations';

type Translate = (key: TranslationKey) => string;

/**
 * Mapea mensajes de error de Supabase Auth (en inglés) a claves i18n.
 * Cualquier mensaje desconocido se muestra tal cual.
 */
export function translateAuthError(msg: string, t: Translate): string {
  if (msg.includes('Invalid login credentials')) return t('authErrorInvalid');
  if (msg.includes('User already registered')) return t('authErrorAlreadyRegistered');
  if (msg.includes('Password should be at least')) return t('authErrorShortPassword');
  if (msg.includes('Unable to validate email address')) return t('authErrorInvalidEmail');
  if (msg.includes('Email not confirmed')) return t('authEmailNotConfirmed');
  if (msg.includes('Not configured')) return t('authErrorNotConfigured');
  return msg;
}
