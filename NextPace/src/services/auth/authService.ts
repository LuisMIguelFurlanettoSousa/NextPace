import { supabase } from '../supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

export interface AuthResult {
  success: boolean;
  error?: string;
}

const redirectTo = makeRedirectUri();

export const authService = {
  async signUp(email: string, password: string, displayName?: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async signInWithGoogle(): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return { success: false, error: error?.message ?? 'Erro ao iniciar login com Google' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success') {
      return { success: false, error: 'Login com Google cancelado' };
    }

    const url = new URL(result.url);
    const params = new URLSearchParams(url.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return { success: false, error: 'Tokens não encontrados na resposta' };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) return { success: false, error: sessionError.message };
    return { success: true };
  },

  async signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async resetPassword(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectTo}?type=recovery`,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return data;
  },

  async updateProfile(updates: { display_name?: string; avatar_url?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
