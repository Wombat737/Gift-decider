-- Gift Decider Phase 2: taste/vibe, occasions, pledges, AU defaults.
-- Surprise-safe: owners still must not see reserve / purchase / pledge progress.

create type public.item_kind as enum ('exact', 'vibe');

alter table public.profiles
  alter column locale set default 'en-AU';

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
    coalesce(new.raw_user_meta_data ->> 'locale', 'en-AU')
  );

  insert into public.wishlists (owner_id, title)
  values (new.id, 'My wishlist');

  return new;
end;
$$;

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  title text not null,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index occasions_wishlist_id_idx on public.occasions (wishlist_id);
create index occasions_share_token_idx on public.occasions (share_token);

create trigger occasions_set_updated_at
  before update on public.occasions
  for each row execute function public.set_updated_at();

alter table public.wishlist_items
  add column item_kind public.item_kind not null default 'exact',
  add column size_hint text,
  add column target_amount numeric(12, 2),
  add column occasion_id uuid references public.occasions (id) on delete set null,
  add column is_group_gift boolean not null default false;

create index wishlist_items_occasion_id_idx on public.wishlist_items (occasion_id);

create table public.item_pledges (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.wishlist_items (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  display_name text,
  created_at timestamptz not null default now()
);

create index item_pledges_item_id_idx on public.item_pledges (item_id);

-- Viewers/givers may flip reservation + group-gift flags. Owners can change anything.
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
     or new.item_kind is distinct from old.item_kind
     or new.size_hint is distinct from old.size_hint
     or new.target_amount is distinct from old.target_amount
     or new.occasion_id is distinct from old.occasion_id
  then
    raise exception 'Viewers can only update reserve / purchased / group-gift fields';
  end if;

  return new;
end;
$$;

-- Resolve a wishlist share token or an occasion share token.
create or replace function public.resolve_share_token(p_token text)
returns table (
  wishlist_id uuid,
  occasion_id uuid,
  occasion_title text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select w.id, o.id, o.title
  from public.occasions o
  join public.wishlists w on w.id = o.wishlist_id
  where o.share_token = p_token
  limit 1;

  if found then
    return;
  end if;

  return query
  select w.id, null::uuid, null::text
  from public.wishlists w
  where w.share_token = p_token
  limit 1;
end;
$$;

create or replace function public.shared_item_visible(p_token text, p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wishlist_items i
    join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
    where i.id = p_item_id
      and (r.occasion_id is null or i.occasion_id = r.occasion_id)
  );
$$;

drop function if exists public.get_shared_wishlist(text);
drop function if exists public.get_shared_wishlist_items(text);
drop function if exists public.set_shared_item_status(text, uuid, public.item_status, text);

create function public.get_shared_wishlist(p_token text)
returns table (
  id uuid,
  title text,
  owner_handle text,
  owner_display_name text,
  occasion_id uuid,
  occasion_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    case
      when r.occasion_title is not null then w.title || ' · ' || r.occasion_title
      else w.title
    end,
    p.handle,
    p.display_name,
    r.occasion_id,
    r.occasion_title
  from public.resolve_share_token(p_token) r
  join public.wishlists w on w.id = r.wishlist_id
  join public.profiles p on p.id = w.owner_id;
$$;

create function public.get_shared_wishlist_items(p_token text)
returns setof public.wishlist_items
language sql
stable
security definer
set search_path = public
as $$
  select i.*
  from public.wishlist_items i
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by i.created_at desc;
$$;

create function public.set_shared_item_status(
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

  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
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
  where i.id = p_item_id
  returning i.* into result;

  if result.id is null then
    raise exception 'Wishlist item not found for that share link';
  end if;

  return result;
end;
$$;

create or replace function public.set_shared_item_group_gift(
  p_token text,
  p_item_id uuid,
  p_is_group_gift boolean
)
returns public.wishlist_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wishlist_items;
begin
  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  update public.wishlist_items
  set is_group_gift = p_is_group_gift
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.list_shared_item_pledges(p_token text)
returns setof public.item_pledges
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.item_pledges p
  join public.wishlist_items i on i.id = p.item_id
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by p.created_at asc;
$$;

create or replace function public.add_shared_item_pledge(
  p_token text,
  p_item_id uuid,
  p_amount numeric,
  p_display_name text default null
)
returns public.item_pledges
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.item_pledges;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount to chip in';
  end if;

  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  update public.wishlist_items
  set is_group_gift = true
  where id = p_item_id;

  insert into public.item_pledges (item_id, amount, display_name)
  values (p_item_id, round(p_amount, 2), nullif(trim(p_display_name), ''))
  returning * into result;

  return result;
end;
$$;

grant execute on function public.resolve_share_token(text) to anon, authenticated;
grant execute on function public.shared_item_visible(text, uuid) to anon, authenticated;
grant execute on function public.get_shared_wishlist(text) to anon, authenticated;
grant execute on function public.get_shared_wishlist_items(text) to anon, authenticated;
grant execute on function public.set_shared_item_status(text, uuid, public.item_status, text) to anon, authenticated;
grant execute on function public.set_shared_item_group_gift(text, uuid, boolean) to anon, authenticated;
grant execute on function public.list_shared_item_pledges(text) to anon, authenticated;
grant execute on function public.add_shared_item_pledge(text, uuid, numeric, text) to anon, authenticated;

alter table public.occasions enable row level security;
alter table public.item_pledges enable row level security;

create policy occasions_owner_all
  on public.occasions for all
  to authenticated
  using (public.is_wishlist_owner(wishlist_id))
  with check (public.is_wishlist_owner(wishlist_id));

create policy occasions_member_select
  on public.occasions for select
  to authenticated
  using (public.is_accepted_member(wishlist_id));

-- Pledges are giver-only. Owners have no SELECT policy (surprise-safe).
create policy item_pledges_member_select
  on public.item_pledges for select
  to authenticated
  using (
    public.is_accepted_member((select wishlist_id from public.wishlist_items i where i.id = item_id))
    and not public.is_wishlist_owner((select wishlist_id from public.wishlist_items i where i.id = item_id))
  );

create policy item_pledges_member_insert
  on public.item_pledges for insert
  to authenticated
  with check (
    public.is_accepted_member((select wishlist_id from public.wishlist_items i where i.id = item_id))
    and not public.is_wishlist_owner((select wishlist_id from public.wishlist_items i where i.id = item_id))
  );

grant select, insert, update, delete on public.occasions to authenticated;
grant select, insert on public.item_pledges to authenticated;
