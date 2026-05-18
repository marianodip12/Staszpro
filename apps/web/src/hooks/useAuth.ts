'use client';

/**
 * useAuth — Client-side auth state + actions.
 *
 * Subscribes to Supabase auth state changes and exposes:
 *  - user / session  (current state)
 *  - loading         (initial bootstrap)
 *  - signIn / signUp / signOut
 *  - sendMagicLink   (passwordless flow)
 *
 * This hook is the only place in apps/web that talks directly to
 * supabase.auth.* — everything else consumes the cached state.
 */

import { useEffect, useState, useCallback } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { useSupabase } from '@/lib/supabase-provider';

interface SignUpInput {
  email:        string;
  password:     string;
  displayName?: string;
}

interface SignInInput {
  email:    string;
  password: string;
}

export interface UseAuthReturn {
  user:     User    | null;
  session:  Session | null;
  loading:  boolean;
  signIn:   (input: SignInInput) => Promise<{ error: AuthError | null }>;
  signUp:   (input: SignUpInput) => Promise<{ error: AuthError | null }>;
  signOut:  () => Promise<void>;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ error: AuthError | null }>;
}

export function useAuth(): UseAuthReturn {
  const supabase = useSupabase();
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Bootstrap: read existing session from local storage / cookie
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to future changes (sign-in, sign-out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, [supabase]);

  const signUp = useCallback(async ({ email, password, displayName }: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName ?? null },
      },
    });
    return { error };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const sendMagicLink = useCallback(async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    return { error };
  }, [supabase]);

  return { user, session, loading, signIn, signUp, signOut, sendMagicLink };
}
