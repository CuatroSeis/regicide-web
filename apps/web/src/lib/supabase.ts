import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente Supabase. En tests o si faltan las env vars, se devuelve un cliente
 * stub que no rompe la importación pero las llamadas fallan silenciosamente.
 */
function createSupabaseClient(): SupabaseClient {
  if (!url || !anonKey) {
    // Stub para tests: createClient lanza si url es vacío, así que mockeamos.
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        if (prop === 'auth') {
          return new Proxy({} as SupabaseClient['auth'], {
            get(_a, aProp) {
              if (aProp === 'getSession') return async () => ({ data: { session: null }, error: null });
              if (aProp === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe: () => {} } } });
              if (aProp === 'signInWithPassword') return async () => ({ error: { message: 'Not configured' } });
              if (aProp === 'signUp') return async () => ({ error: { message: 'Not configured' } });
              if (aProp === 'signOut') return async () => {};
              if (aProp === 'resetPasswordForEmail') return async () => ({ error: { message: 'Not configured' } });
              if (aProp === 'getUser') return async () => ({ data: { user: null }, error: null });
              if (aProp === 'updateUser') return async () => ({ data: { user: null }, error: { message: 'Not configured' } });
              return () => {};
            },
          });
        }
        return () => {};
      },
    }) as SupabaseClient;
  }
  return createClient(url, anonKey);
}

export const supabase = createSupabaseClient();
