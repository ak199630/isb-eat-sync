"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUserProfile, fetchUserProfile } from "@/lib/db/users";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    residentialBlockId: string | null
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile ?? null);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user?.id) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile ?? null);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      residentialBlockId: string | null
    ): Promise<{ error: string | null }> => {
      if (!supabase) return { error: "App not configured" };
      try {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: undefined },
        });
        if (authError) return { error: authError.message };
        if (!data.user?.id) return { error: "Sign up failed" };

        await createUserProfile(
          data.user.id,
          email,
          displayName.trim() || email.split("@")[0],
          residentialBlockId
        );

        const profile = await fetchUserProfile(data.user.id);
        setUser(profile ?? null);
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Sign up failed" };
      }
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!supabase) return { error: "App not configured" };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, isLoading, signUp, signIn, signOut }),
    [user, isLoading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
