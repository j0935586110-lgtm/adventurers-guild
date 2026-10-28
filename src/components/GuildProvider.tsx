import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface GuildProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  balance_g_coin: number;
  frozen_g_coin: number;
  reputation_points: number;
  rank: string;
  bio: string;
  skill_tags: string[];
}

interface GuildContextType {
  user: User | null;
  profile: GuildProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; confirmationRequired?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

// Compute rank from reputation
function repToRank(rep: number): string {
  if (rep >= 1000) return 'S';
  if (rep >= 500) return 'A';
  if (rep >= 200) return 'B';
  if (rep >= 100) return 'C';
  if (rep >= 50) return 'D';
  if (rep >= 10) return 'E';
  return 'F';
}

export const GuildProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GuildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch guild profile from users table
  const fetchProfile = async (userId: string) => {
    const [profileResult, walletResult] = await Promise.all([
      supabase.from('users')
        .select('id,display_name,avatar_url,bio,skill_tags,reputation_points')
        .eq('id', userId).maybeSingle(),
      supabase.rpc('guild_my_wallet'),
    ]);
    const data = profileResult.data;
    const wallet = walletResult.data?.[0];
    if (data) {
      setProfile({
        id: data.id,
        display_name: data.display_name,
        avatar_url: data.avatar_url || '',
        balance_g_coin: wallet ? Number(wallet.balance_g_coin) : 0,
        frozen_g_coin: wallet ? Number(wallet.frozen_g_coin) : 0,
        reputation_points: data.reputation_points,
        rank: repToRank(data.reputation_points),
        bio: data.bio || '',
        skill_tags: data.skill_tags || [],
      });
    } else {
      // An Auth session is sufficient for the personal marketplace, but
      // never fabricate balances/permissions if the legacy profile is absent.
      setProfile(null);
    }
  };

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Don't await a Supabase database call inside the auth callback.
          // It can deadlock while the auth client's internal lock is held.
          setTimeout(() => {
            void fetchProfile(currentUser.id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch profile (call after mutations)
  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // Expose refresh via window for App.tsx
  (window as any).__guildRefreshProfile = refreshProfile;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, guild_nickname: name } }
    });
    if (error) return { error: error.message };
    // Hosted projects commonly require email confirmation: do not
    // tell users they are signed in when the provider returned no session.
    return { confirmationRequired: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Preserve OAuth consent URL and its authorization_id on social sign-in.
      options: { redirectTo: window.location.href }
    });
    return error ? { error: error.message } : {};
  };

  return (
    <GuildContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error('useGuild must be used within a GuildProvider');
  }
  return context;
};
