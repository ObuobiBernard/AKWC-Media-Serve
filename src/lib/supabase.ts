import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvOrStorage = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    const val = String(import.meta.env[key]).trim();
    if (
      val &&
      !val.includes('MY_SUPABASE') &&
      !val.startsWith('PLACEHOLDER') &&
      !val.includes('placeholder')
    ) {
      return val;
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem(key)?.trim();
    if (
      stored &&
      !stored.includes('placeholder') &&
      !stored.includes('MY_SUPABASE')
    ) {
      return stored;
    }
  }
  return '';
};

const rawSupabaseUrl = getEnvOrStorage('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  supabaseAnonKey &&
  rawSupabaseUrl.startsWith('http') &&
  !rawSupabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

export const getSupabaseConfig = () => ({
  url: rawSupabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
});

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const cleanKey = anonKey.trim();
    window.localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
    window.localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);
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

export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; tablesFound?: boolean }> => {
  const targetUrl = (testUrl || rawSupabaseUrl)
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const targetKey = (testKey || supabaseAnonKey).trim();

  if (!targetUrl || !targetKey || targetUrl.includes('placeholder')) {
    return {
      success: false,
      message: 'Supabase Project URL and Anon API Key are required.',
    };
  }

  try {
    const client = createClient(targetUrl, targetKey);
    const { error } = await client.from('members').select('id').limit(1);

    if (error) {
      if (
        error.message?.includes('relation "public.members" does not exist') ||
        error.message?.includes('does not exist') ||
        error.code === '42P01'
      ) {
        return {
          success: true,
          tablesFound: false,
          message:
            'Connected to Supabase! However, the database tables have not been created yet. Please copy the SQL script below, open Supabase SQL Editor, and tap Run.',
        };
      }
      return { success: false, message: `Supabase Error: ${error.message}` };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Successfully connected! Supabase database tables are live and ready.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection test failed: ${err?.message || 'Network unreachable or invalid URL'}`,
    };
  }
};

const supabaseUrl = isSupabaseConfigured
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
  : 'https://placeholder.supabase.co';

const safeAnonKey = isSupabaseConfigured
  ? supabaseAnonKey
  : 'placeholder-anon-key-preventing-app-crash';

export const supabase: SupabaseClient = createClient(supabaseUrl, safeAnonKey);
