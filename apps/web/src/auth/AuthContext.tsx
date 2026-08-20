import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AvatarId } from '../components/AvatarCard';

interface AuthState {
  /** Usuario autenticado (null si no hay sesión). */
  user: User | null;
  /** Sesión completa (contiene el access_token). */
  session: Session | null;
  /** true mientras se restaura la sesión del storage. */
  loading: boolean;
  /** Email + password → sesión. */
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  /** Registro con email + password + nombre. */
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error?: string }>;
  /** Cerrar sesión. */
  signOut: () => Promise<void>;
  /** Solicitar email de recuperación de contraseña. */
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useMemo(
    () =>
      async (email: string, password: string): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },
    [],
  );

  const signUp = useMemo(
    () =>
      async (
        email: string,
        password: string,
        displayName: string,
      ): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        return error ? { error: error.message } : {};
      },
    [],
  );

  const signOut = useMemo(
    () =>
      async (): Promise<void> => {
        await supabase.auth.signOut();
      },
    [],
  );

  const resetPassword = useMemo(
    () =>
      async (email: string): Promise<{ error?: string }> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return error ? { error: error.message } : {};
      },
    [],
  );

  const value: AuthState = useMemo(
    () => ({ user, session, loading, signIn, signUp, signOut, resetPassword }),
    [user, session, loading, signIn, signUp, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook para acceder al estado de autenticación. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Nombre para mostrar: display_name del user_metadata, o el email. */
export function displayName(user: User | null): string {
  if (!user) return '';
  return (user.user_metadata?.display_name as string) || user.email || 'Jugador';
}

/** Avatar del usuario: avatar_id del user_metadata. */
export function avatarId(user: User | null): AvatarId {
  const raw = user?.user_metadata?.avatar_id;
  if (raw === 'jack' || raw === 'queen' || raw === 'king' || raw === 'joker' || raw === 'ace') {
    return raw;
  }
  return 'king';
}

/** Access token JWT (para enviarlo al server). */
export function accessToken(session: Session | null): string | null {
  return session?.access_token ?? null;
}
