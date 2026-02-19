import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey.length > 0;

let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!isSupabaseConfigured) {
        // Retorna stubs seguros para quando o Supabase não está configurado
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signUp: async () => ({ data: {}, error: { message: 'Supabase não configurado' } }),
            signInWithPassword: async () => ({ data: {}, error: { message: 'Supabase não configurado' } }),
            signInWithOAuth: async () => ({ data: {}, error: { message: 'Supabase não configurado' } }),
            signOut: async () => ({ error: null }),
            resetPasswordForEmail: async () => ({ data: {}, error: { message: 'Supabase não configurado' } }),
            setSession: async () => ({ data: {}, error: { message: 'Supabase não configurado' } }),
          };
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), data: [], error: null }), is: () => ({ order: async () => ({ data: [], error: null }) }), in: () => ({ is: () => ({ order: async () => ({ data: [], error: null }) }) }), gt: async () => ({ data: [], error: null }), data: [], error: null }),
            insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase não configurado' } }) }) }),
            update: () => ({ eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase não configurado' } }) }) }) }) }),
            upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Supabase não configurado' } }) }) }),
          });
        }
        return undefined;
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    }
    return (_supabase as any)[prop];
  },
});
