import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

// Web: persist with browser localStorage. Native override: supabase.native.ts
export const supabase: SupabaseClient | null = env.isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        storage: typeof localStorage === 'undefined' ? undefined : localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
