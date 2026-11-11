import { supabase } from '@/lib/supabase';
import { usesDemoData } from '@/lib/app-mode';
import { acceptDemoTerms, getDemoOwnSocialProfile, updateDemoOwnSocialProfile } from '@/lib/demo-social';
import { isCommentSchemaMiss, normalizeTasteTags } from '@/lib/giver-social';
import type { Discoverability, Profile } from '@/lib/types';

let demoAvatarUrl: string | null = null;

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
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    terms_accepted_at: Object.prototype.hasOwnProperty.call(row, 'terms_accepted_at')
      ? ((row.terms_accepted_at as string | null) ?? null)
      : undefined,
  };
}

function missingColumn(error: { message?: string; code?: string } | null) {
  const blob = `${error?.code ?? ''} ${error?.message ?? ''}`;
  return /42703|PGRST204|could not find the [\w. ]*column/i.test(blob);
}

const PROFILE_SELECT = 'id, handle, display_name, locale, discoverability, taste_tags';
const PROFILE_SELECT_WITH_TERMS = `${PROFILE_SELECT}, terms_accepted_at`;
const PROFILE_SELECT_WITH_AVATAR = `${PROFILE_SELECT_WITH_TERMS}, avatar_url`;

export async function getOwnProfile(): Promise<Profile | null> {
  if (usesDemoData() || !supabase) {
    return { ...getDemoOwnSocialProfile(DEMO_PROFILE), avatar_url: demoAvatarUrl };
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const withAvatar = await supabase.from('profiles').select(PROFILE_SELECT_WITH_AVATAR).eq('id', userId).maybeSingle();
  if (!withAvatar.error) return withAvatar.data ? asProfile(withAvatar.data as Record<string, unknown>) : null;

  const { data, error } = missingColumn(withAvatar.error)
    ? await supabase.from('profiles').select(PROFILE_SELECT_WITH_TERMS).eq('id', userId).maybeSingle()
    : withAvatar;

  if (!error) return data ? asProfile(data as Record<string, unknown>) : null;

  if (missingColumn(error)) {
    const social = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
    if (!social.error) return social.data ? asProfile(social.data as Record<string, unknown>) : null;
  }

  // Pre-giver-social projects: fall back to the original columns.
  const fallback = await supabase.from('profiles').select('id, handle, display_name, locale').eq('id', userId).maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data ? asProfile(fallback.data as Record<string, unknown>) : null;
}

/** Records Terms acceptance. Null means the server does not have accept_terms yet. */
export async function acceptTerms(): Promise<string | null> {
  if (usesDemoData() || !supabase) return acceptDemoTerms();

  const { data, error } = await supabase.rpc('accept_terms');
  if (error) {
    if (isCommentSchemaMiss(error)) return null;
    throw error;
  }
  return typeof data === 'string' ? data : new Date().toISOString();
}

export async function updateOwnProfile(patch: {
  display_name?: string | null;
  handle?: string | null;
  discoverability?: Discoverability;
  taste_tags?: string[];
  avatar_url?: string | null;
}): Promise<Profile> {
  if (usesDemoData() || !supabase) {
    const next = updateDemoOwnSocialProfile({
      discoverability: patch.discoverability,
      taste_tags: patch.taste_tags,
    });
    if (patch.avatar_url !== undefined) demoAvatarUrl = patch.avatar_url?.trim() || null;
    return {
      ...next,
      display_name: patch.display_name === undefined ? next.display_name : patch.display_name,
      handle: patch.handle === undefined ? next.handle : patch.handle,
      avatar_url: demoAvatarUrl,
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
  if (patch.avatar_url !== undefined) {
    payload.avatar_url = patch.avatar_url?.trim() || null;
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in again to update your profile.');

  let { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select(PROFILE_SELECT).single();

  if (error && missingColumn(error) && Object.prototype.hasOwnProperty.call(payload, 'avatar_url')) {
    const avatarUrl = payload.avatar_url as string | null;
    const rest = { ...payload };
    delete rest.avatar_url;
    if (Object.keys(rest).length === 0) {
      const current = await getOwnProfile();
      return { ...(current ?? asProfile({ id: userId })), avatar_url: avatarUrl };
    }
    const retry = await supabase.from('profiles').update(rest).eq('id', userId).select(PROFILE_SELECT).single();
    if (retry.error) {
      if (retry.error.code === '23505') throw new Error('That handle is already taken.');
      throw retry.error;
    }
    return { ...asProfile(retry.data as Record<string, unknown>), avatar_url: avatarUrl };
  }

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
