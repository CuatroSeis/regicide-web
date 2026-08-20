import { createClient, type User } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (url && serviceKey) {
  supabase = createClient(url, serviceKey);
}

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Verifica un JWT de Supabase Auth y devuelve el usuario.
 * Lanza Error si el token es inválido o falta la configuración.
 */
export async function verifyToken(token: string): Promise<AuthUser> {
  if (!supabase) {
    throw new Error('Supabase Auth no está configurado (falta SUPABASE_URL o SUPABASE_SERVICE_KEY)');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Token inválido');
  }

  const user: User = data.user;
  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: (user.user_metadata?.display_name as string) || user.email || 'Jugador',
  };
}

/** Extrae el token Bearer de un header Authorization. */
export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
