import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { localStorage } from '../storage/localStorage';
import { migrationService } from '../migration/migrationService';
import type { Profile } from '../../types/models';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOfflineOnly: boolean;
}

interface AuthContextType extends AuthState {
  setOfflineOnly: (value: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isOfflineOnly: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!data) return null;

      return {
        id: data.id,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user, fetchProfile]);

  const setOfflineOnly = useCallback(async (value: boolean) => {
    await localStorage.set(localStorage.KEYS.OFFLINE_MODE, value);
    setState((prev) => ({
      ...prev,
      isOfflineOnly: value,
      isLoading: false,
    }));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const offlineMode = await localStorage.get<boolean>(localStorage.KEYS.OFFLINE_MODE);

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          session,
          user: session.user,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isOfflineOnly: false,
        });
      } else {
        setState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isOfflineOnly: offlineMode ?? false,
        });
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);

        // Migrar dados legados no primeiro login
        if (event === 'SIGNED_IN') {
          const hasLegacy = await migrationService.hasLegacyData();
          if (hasLegacy) {
            try {
              const result = await migrationService.migrate(session.user.id);
              console.log(`[migration] Migrados: ${result.trainings} treinos, ${result.workouts} logs`);
            } catch (error) {
              console.error('[migration] Erro na migração:', error);
            }
          }
        }

        setState((prev) => ({
          ...prev,
          session,
          user: session.user,
          profile,
          isAuthenticated: true,
          isOfflineOnly: false,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          session: null,
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ ...state, setOfflineOnly, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
