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
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
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
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile({
        id: data.id,
        display_name: data.display_name,
        avatar_url: data.avatar_url || '',
        balance_g_coin: data.balance_g_coin,
        frozen_g_coin: data.frozen_g_coin,
        reputation_points: data.reputation_points,
        rank: repToRank(data.reputation_points),
        bio: data.bio || '',
        skill_tags: data.skill_tags || [],
      });
    }
  };

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) return { error: error.message };
    // Wait for trigger to create users row
    await new Promise(r => setTimeout(r, 1500));
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <GuildContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
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
