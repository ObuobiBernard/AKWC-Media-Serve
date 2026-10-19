import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvOrStorage = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    const val = String(import.meta.env[key]).trim();
    if (val && !val.includes('MY_SUPABASE') && !val.startsWith('PLACEHOLDER')) {
      return val;
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(key)?.trim();
    if (stored) return stored;
  }
  return '';
};

const rawSupabaseUrl = getEnvOrStorage('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  supabaseAnonKey &&
  rawSupabaseUrl.includes('supabase.co')
);

export const getSupabaseConfig = () => ({
  url: rawSupabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
});

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('VITE_SUPABASE_URL', url.trim());
    window.localStorage.setItem('VITE_SUPABASE_ANON_KEY', anonKey.trim());
    window.location.reload();
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('VITE_SUPABASE_URL');
    window.localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    window.location.reload();
  }
};

const supabaseUrl = isSupabaseConfigured
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  : 'https://placeholder.supabase.co';

const safeAnonKey = isSupabaseConfigured
  ? supabaseAnonKey
  : 'placeholder-anon-key-preventing-app-crash';

export const supabase: SupabaseClient = createClient(supabaseUrl, safeAnonKey);
