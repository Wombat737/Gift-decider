-- Gift Decider — initial schema + RLS
-- Recipients own wishlists. Shared givers read a list and can reserve / mark purchased.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.item_source_type as enum ('manual', 'instagram', 'url');
create type public.item_status as enum ('available', 'reserved', 'purchased');
create type public.member_role as enum ('owner', 'viewer');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique,
  display_name text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handle_format check (
    handle is null or handle ~ '^[a-z0-9_]{3,30}$'
  )
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'My wishlist',
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  image_path text,
  image_url text,
  title text,
  notes text,
  source_type public.item_source_type not null default 'manual',
  source_url text,
  buy_url text,
  tags text[] not null default '{}',
  no_substitution boolean not null default false,
  status public.item_status not null default 'available',
  reserved_by text,
  reserved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlist_members (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  email text,
  role public.member_role not null default 'viewer',
  invite_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_has_identity check (user_id is not null or email is not null)
);

create unique index wishlist_members_wishlist_email_uidx
  on public.wishlist_members (wishlist_id, lower(email))
  where email is not null;

create unique index wishlist_members_wishlist_user_uidx
  on public.wishlist_members (wishlist_id, user_id)
  where user_id is not null;

create table public.link_previews (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text,
  description text,
  image_url text,
  provider text,
  fetched_at timestamptz not null default now(),
  raw jsonb
);

create index wishlist_items_wishlist_id_idx on public.wishlist_items (wishlist_id);
create index wishlists_owner_id_idx on public.wishlists (owner_id);
create index wishlists_share_token_idx on public.wishlists (share_token);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger wishlists_set_updated_at
  before update on public.wishlists
  for each row execute function public.set_updated_at();

create trigger wishlist_items_set_updated_at
  before update on public.wishlist_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Signup: profile + default wishlist
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'friend'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  );

  insert into public.wishlists (owner_id, title)
  values (new.id, 'My wishlist');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers (security definer so RLS policies can call them without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_wishlist_owner(p_wishlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wishlists w
    where w.id = p_wishlist_id
      and w.owner_id = auth.uid()
  );
$$;

create or replace function public.is_accepted_member(p_wishlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wishlist_members m
    where m.wishlist_id = p_wishlist_id
      and m.user_id = auth.uid()
      and m.accepted_at is not null
  );
$$;

create or replace function public.can_view_wishlist(p_wishlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_wishlist_owner(p_wishlist_id)
      or public.is_accepted_member(p_wishlist_id);
$$;

-- Viewers/givers may only flip reservation fields — owners can change anything.
create or replace function public.protect_item_giver_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_wishlist_owner(new.wishlist_id) then
    return new;
  end if;

  if new.wishlist_id is distinct from old.wishlist_id
     or new.image_path is distinct from old.image_path
     or new.image_url is distinct from old.image_url
     or new.title is distinct from old.title
     or new.notes is distinct from old.notes
     or new.source_type is distinct from old.source_type
     or new.source_url is distinct from old.source_url
     or new.buy_url is distinct from old.buy_url
     or new.tags is distinct from old.tags
     or new.no_substitution is distinct from old.no_substitution
  then
    raise exception 'Viewers can only update reserve / purchased fields';
  end if;

  return new;
end;
$$;

create trigger wishlist_items_protect_giver_columns
  before update on public.wishlist_items
  for each row execute function public.protect_item_giver_columns();

-- ---------------------------------------------------------------------------
-- Share-token RPCs (anonymous givers — no login required)
-- ---------------------------------------------------------------------------

create or replace function public.get_shared_wishlist(p_token text)
returns table (
  id uuid,
  title text,
  owner_handle text,
  owner_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    w.title,
    p.handle,
    p.display_name
  from public.wishlists w
  join public.profiles p on p.id = w.owner_id
  where w.share_token = p_token;
$$;

create or replace function public.get_shared_wishlist_items(p_token text)
returns setof public.wishlist_items
language sql
stable
security definer
set search_path = public
as $$
  select i.*
  from public.wishlist_items i
  join public.wishlists w on w.id = i.wishlist_id
  where w.share_token = p_token
  order by i.created_at desc;
$$;

create or replace function public.set_shared_item_status(
  p_token text,
  p_item_id uuid,
  p_status public.item_status,
  p_reserved_by text default null
)
returns public.wishlist_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wishlist_items;
begin
  if p_status not in ('available', 'reserved', 'purchased') then
    raise exception 'Invalid status';
  end if;

  update public.wishlist_items i
  set
    status = p_status,
    reserved_by = case
      when p_status = 'available' then null
      else coalesce(nullif(trim(p_reserved_by), ''), i.reserved_by, 'A generous friend')
    end,
    reserved_at = case
      when p_status = 'available' then null
      else coalesce(i.reserved_at, now())
    end
  from public.wishlists w
  where i.id = p_item_id
    and i.wishlist_id = w.id
    and w.share_token = p_token
  returning i.* into result;

  if result.id is null then
    raise exception 'Wishlist item not found for that share link';
  end if;

  return result;
end;
$$;

grant execute on function public.get_shared_wishlist(text) to anon, authenticated;
grant execute on function public.get_shared_wishlist_items(text) to anon, authenticated;
grant execute on function public.set_shared_item_status(text, uuid, public.item_status, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_members enable row level security;
alter table public.link_previews enable row level security;

-- profiles: owner full CRUD (insert happens via trigger / signup)
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- wishlists
create policy wishlists_owner_all
  on public.wishlists for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy wishlists_member_select
  on public.wishlists for select
  to authenticated
  using (public.is_accepted_member(id));

-- wishlist_items
create policy wishlist_items_owner_all
  on public.wishlist_items for all
  to authenticated
  using (public.is_wishlist_owner(wishlist_id))
  with check (public.is_wishlist_owner(wishlist_id));

create policy wishlist_items_member_select
  on public.wishlist_items for select
  to authenticated
  using (public.is_accepted_member(wishlist_id));

create policy wishlist_items_member_reserve
  on public.wishlist_items for update
  to authenticated
  using (public.is_accepted_member(wishlist_id))
  with check (public.is_accepted_member(wishlist_id));

-- wishlist_members (invites)
create policy wishlist_members_owner_all
  on public.wishlist_members for all
  to authenticated
  using (public.is_wishlist_owner(wishlist_id))
  with check (public.is_wishlist_owner(wishlist_id));

create policy wishlist_members_self_select
  on public.wishlist_members for select
  to authenticated
  using (user_id = auth.uid());

-- link_previews: authenticated cache for the paste-URL flow
create policy link_previews_authenticated_select
  on public.link_previews for select
  to authenticated
  using (true);

create policy link_previews_authenticated_insert
  on public.link_previews for insert
  to authenticated
  with check (true);

create policy link_previews_authenticated_update
  on public.link_previews for update
  to authenticated
  using (true)
  with check (true);

-- Table privileges (explicit — hosted projects usually already grant these)
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.wishlists to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, update, delete on public.wishlist_members to authenticated;
grant select, insert, update on public.link_previews to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: wishlist item photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('wishlist-images', 'wishlist-images', true)
on conflict (id) do nothing;

create policy wishlist_images_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'wishlist-images');

create policy wishlist_images_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy wishlist_images_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy wishlist_images_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
