import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  /** Sign up with email + password. Returns null on success, error message on failure. */
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  /** Sign in with email + password. Returns null on success, error message on failure. */
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  /** Sign in with Google OAuth. Redirects away from the app on success. */
  signInWithGoogle: () => Promise<string | null>;
  /** Sign out (clears the current session, including auth.users). */
  signOut: () => Promise<void>;
  /** True if the current user is anonymous (signed in but no email). */
  isAnonymous: boolean;
  /** True if the current user is fully registered (has an email). */
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ANON_UID_KEY = 'hp_anon_uid';

/**
 * Migrates data from an old user_id (anonymous) to a new one (real account).
 * Uses a SECURITY DEFINER function in Supabase to bypass RLS.
 */
async function migrateAnonDataToRealUser(
  oldUserId: string,
  newUserId: string,
): Promise<void> {
  if (oldUserId === newUserId) return;
  if (!oldUserId || !newUserId) return;

  try {
    const { error } = await supabase.rpc('migrate_user_data', {
      old_user_id: oldUserId,
      new_user_id: newUserId,
    });
    if (error) {
      console.error('[auth] Migration RPC failed:', error.message);
    } else {
      console.log('[auth] Migrated data from', oldUserId, 'to', newUserId);
    }
  } catch (err) {
    console.error('[auth] Migration failed:', err);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Initial fetch + subscription to auth state changes.
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;
        setState({ user, session: data.session, loading: false });

        // If user is real (has email), check if we need to migrate data from an old anon user
        if (user && user.email) {
          const oldUserId = localStorage.getItem(ANON_UID_KEY);
          if (oldUserId && oldUserId !== user.id) {
            await migrateAnonDataToRealUser(oldUserId, user.id);
          }
          localStorage.setItem(ANON_UID_KEY, user.id);
        } else if (user && !user.email) {
          // Anonymous user
          localStorage.setItem(ANON_UID_KEY, user.id);
        }
      } catch {
        setState({ user: null, session: null, loading: false });
      }

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user ?? null;

        // On state change, also check for migration needs
        if (user && user.email) {
          const oldUserId = localStorage.getItem(ANON_UID_KEY);
          if (oldUserId && oldUserId !== user.id) {
            await migrateAnonDataToRealUser(oldUserId, user.id);
          }
          localStorage.setItem(ANON_UID_KEY, user.id);
        } else if (user && !user.email) {
          localStorage.setItem(ANON_UID_KEY, user.id);
        }

        setState({ user, session, loading: false });
      });
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => {
      unsub?.();
    };
  }, []);

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // After confirming email, send the user back to the app
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) return error.message;
      return null;
    },
    [],
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return error.message;
      return null;
    },
    [],
  );

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) return error.message;
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, loading: false });
  }, []);

  const user = state.user;
  // Supabase considers anon users with `is_anonymous: true` (or no email).
  const isAnonymous = !!user && (user.is_anonymous === true || !user.email);
  const isAuthenticated = !!user && !isAnonymous;

  const value: AuthContextValue = {
    ...state,
    signUpWithPassword,
    signInWithPassword,
    signInWithGoogle,
    signOut,
    isAnonymous,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
