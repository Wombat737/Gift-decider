import { supabase } from '@/lib/supabase';
import { usesDemoData } from '@/lib/app-mode';
import { getDemoOwnSocialProfile, updateDemoOwnSocialProfile } from '@/lib/demo-social';
import { normalizeTasteTags } from '@/lib/giver-social';
import type { Discoverability, Profile } from '@/lib/types';

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  handle: 'jordan',
  display_name: 'Jordan',
  locale: 'en-AU',
  discoverability: 'handle',
  taste_tags: ['linen', 'trail running', 'no candles'],
};

function asDiscoverability(value: unknown): Discoverability {
  return value === 'private' ? 'private' : 'handle';
}

function asProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    locale: typeof row.locale === 'string' && row.locale ? row.locale : 'en-AU',
    discoverability: asDiscoverability(row.discoverability),
    taste_tags: Array.isArray(row.taste_tags) ? (row.taste_tags as string[]) : [],
  };
}

const PROFILE_SELECT = 'id, handle, display_name, locale, discoverability, taste_tags';

export async function getOwnProfile(): Promise<Profile | null> {
  if (usesDemoData() || !supabase) return getDemoOwnSocialProfile(DEMO_PROFILE);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();

  if (error) {
    // Pre-giver-social projects: fall back to the original columns.
    const fallback = await supabase.from('profiles').select('id, handle, display_name, locale').eq('id', userId).maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data ? asProfile(fallback.data as Record<string, unknown>) : null;
  }
  return data ? asProfile(data as Record<string, unknown>) : null;
}

export async function updateOwnProfile(patch: {
  display_name?: string | null;
  handle?: string | null;
  discoverability?: Discoverability;
  taste_tags?: string[];
}): Promise<Profile> {
  if (usesDemoData() || !supabase) {
    const next = updateDemoOwnSocialProfile({
      discoverability: patch.discoverability,
      taste_tags: patch.taste_tags,
    });
    return {
      ...next,
      display_name: patch.display_name === undefined ? next.display_name : patch.display_name,
      handle: patch.handle === undefined ? next.handle : patch.handle,
    };
  }

  const payload: Record<string, unknown> = {};
  if (patch.display_name !== undefined) {
    payload.display_name = patch.display_name?.trim() || null;
  }
  if (patch.handle !== undefined) {
    const handle = patch.handle?.trim().toLowerCase() || null;
    if (handle && !/^[a-z0-9_]{3,30}$/.test(handle)) {
      throw new Error('Handle must be 3–30 characters: lowercase letters, numbers, underscore.');
    }
    payload.handle = handle;
  }
  if (patch.discoverability !== undefined) {
    payload.discoverability = patch.discoverability;
  }
  if (patch.taste_tags !== undefined) {
    payload.taste_tags = normalizeTasteTags(patch.taste_tags);
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in again to update your profile.');

  const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select(PROFILE_SELECT).single();

  if (error) {
    if (error.code === '23505') throw new Error('That handle is already taken.');
    throw error;
  }
  return asProfile(data as Record<string, unknown>);
}

type WorkspaceRow = {
  wishlist_id: string;
  share_token: string;
  title: string;
  owner_id: string;
};

/** Creates profile + default wishlist if the signup trigger missed them. */
export async function ensureOwnWorkspace(): Promise<WorkspaceRow | null> {
  if (usesDemoData() || !supabase) return null;

  const { data, error } = await supabase.rpc('ensure_own_workspace');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as WorkspaceRow) ?? null;
}
