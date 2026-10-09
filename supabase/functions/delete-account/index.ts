// Delete the signed-in account.
// Verifies the caller's JWT, removes their wishlist-images objects, then deletes
// the auth user. Table rows cascade from auth.users → profiles → wishlists.
// Deploy: supabase functions deploy delete-account
// verify_jwt is true in supabase/config.toml. SUPABASE_SERVICE_ROLE_KEY is set
// by the hosted project; do not put it in the app.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'wishlist-images';
const PAGE = 100;

type StorageEntry = {
  name?: string;
  id?: string | null;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bearer(header: string | null) {
  const value = (header ?? '').trim();
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

async function authUserId(url: string, anonKey: string, jwt: string): Promise<string | null> {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: anonKey,
    },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id?: string };
  return typeof body.id === 'string' && body.id ? body.id : null;
}

async function listPage(url: string, serviceKey: string, prefix: string, offset: number): Promise<StorageEntry[]> {
  const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix,
      limit: PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    }),
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not list photos (${res.status}): ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as StorageEntry[] | null;
  return Array.isArray(body) ? body : [];
}

async function collectPaths(url: string, serviceKey: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 6) return [];
  const files: string[] = [];
  let offset = 0;
  for (let page = 0; page < 100; page += 1) {
    const entries = await listPage(url, serviceKey, prefix, offset);
    if (entries.length === 0) break;
    for (const entry of entries) {
      const name = entry.name?.trim();
      if (!name || name === '.' || name.startsWith('.')) continue;
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.id) files.push(path);
      else files.push(...(await collectPaths(url, serviceKey, path, depth + 1)));
    }
    if (entries.length < PAGE) break;
    offset += entries.length;
  }
  return files;
}

async function removePaths(url: string, serviceKey: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += PAGE) {
    const prefixes = paths.slice(i, i + PAGE);
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Could not delete photos (${res.status}): ${detail.slice(0, 200)}`);
    }
  }
}

async function deleteAuthUser(url: string, serviceKey: string, uid: string) {
  const res = await fetch(`${url}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not delete auth user (${res.status}): ${detail.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Couldn’t delete your account.' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anonKey || !serviceKey) {
    console.error('delete-account missing SUPABASE_URL, ANON key, or service role key');
    return json({ error: 'Couldn’t delete your account. Try again later.' }, 500);
  }

  const jwt = bearer(req.headers.get('Authorization'));
  if (!jwt) return json({ error: 'Sign in again, then delete your account.' }, 401);

  try {
    const uid = await authUserId(url, anonKey, jwt);
    if (!uid) return json({ error: 'Sign in again, then delete your account.' }, 401);

    const paths = await collectPaths(url, serviceKey, uid);
    await removePaths(url, serviceKey, paths);
    await deleteAuthUser(url, serviceKey, uid);
    return json({ ok: true });
  } catch (error) {
    console.error('delete-account failed', error instanceof Error ? error.message : error);
    return json({ error: 'Couldn’t delete your account. Try again.' }, 500);
  }
});
