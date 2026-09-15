import { env } from '@/lib/env';
import { isDemoSession, shouldUseDemoData } from '@/lib/demo-session';
import { supabase } from '@/lib/supabase';

/** Explore demo (no env, or signed in via Explore demo). Live CRUD uses Supabase otherwise. */
export function usesDemoData() {
  return shouldUseDemoData({
    supabaseConfigured: env.isSupabaseConfigured && Boolean(supabase),
    demoSession: isDemoSession(),
  });
}
