import { supabase } from '@/lib/supabase';
import { usesDemoData } from '@/lib/app-mode';

/** Best-effort. Missing migration or a private profile just means initials. */
export async function loadAvatars(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0 || usesDemoData() || !supabase) return {};
  const { data, error } = await supabase.rpc('profile_avatars', { p_ids: unique });
  if (error || !Array.isArray(data)) return {};
  const map: Record<string, string> = {};
  for (const row of data as { id?: string; avatar_url?: string | null }[]) {
    if (row.id && row.avatar_url) map[row.id] = row.avatar_url;
  }
  return map;
}
