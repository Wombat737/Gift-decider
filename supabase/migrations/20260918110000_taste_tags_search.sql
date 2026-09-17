-- Giver social C — recipient taste tags → giver search only (strict mode).
-- Tags never returned to giver UI; search RPC filters server-side.
-- Giver browse must not render tag chips. Recipient may edit wrap-chips.

alter table public.profiles
  add column if not exists taste_tags text[] not null default '{}';

comment on column public.profiles.taste_tags is
  'Recipient taste / vibe prefs. Givers may use them only inside search RPCs — never selected onto a giver-readable profile card.';

create index if not exists profiles_taste_tags_gin
  on public.profiles using gin (taste_tags);

create index if not exists wishlist_items_tags_gin
  on public.wishlist_items using gin (tags);

create or replace function public.normalize_tag(p_tag text)
returns text
language sql
immutable
as $$
  select nullif(
    left(
      lower(trim(regexp_replace(coalesce(p_tag, ''), '\s+', ' ', 'g'))),
      32
    ),
    ''
  );
$$;

create or replace function public.normalize_tag_array(p_tags text[], p_max integer)
returns text[]
language sql
immutable
as $$
  select coalesce(
    (
      select array_agg(x.tag order by x.ord)
      from (
        select n.tag, min(n.ord) as ord
        from (
          select public.normalize_tag(x) as tag, row_number() over () as ord
          from unnest(coalesce(p_tags, '{}'::text[])) as x
        ) n
        where n.tag is not null
        group by n.tag
        order by min(n.ord)
        limit p_max
      ) x
    ),
    '{}'::text[]
  );
$$;

create or replace function public.protect_profile_taste_tags()
returns trigger
language plpgsql
as $$
begin
  new.taste_tags := public.normalize_tag_array(new.taste_tags, 30);
  return new;
end;
$$;

drop trigger if exists profiles_normalize_taste_tags on public.profiles;
create trigger profiles_normalize_taste_tags
  before insert or update of taste_tags on public.profiles
  for each row execute function public.protect_profile_taste_tags();

create or replace function public.protect_item_tags()
returns trigger
language plpgsql
as $$
begin
  new.tags := public.normalize_tag_array(new.tags, 10);
  return new;
end;
$$;

drop trigger if exists wishlist_items_normalize_tags on public.wishlist_items;
create trigger wishlist_items_normalize_tags
  before insert or update of tags on public.wishlist_items
  for each row execute function public.protect_item_tags();

-- Strict search hit: id + rank only. No tags, no taste_tags, no notes leak of tag arrays.
create type public.shared_gift_search_hit as (
  id uuid,
  rank integer
);

grant usage on type public.shared_gift_search_hit to anon, authenticated;

create or replace function public.search_wishlist_items(p_wishlist_id uuid, p_q text)
returns setof public.shared_gift_search_hit
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := lower(trim(coalesce(p_q, '')));
begin
  if auth.uid() is null then
    raise exception 'Sign in to search this list';
  end if;
  if public.is_wishlist_owner(p_wishlist_id) then
    raise exception 'Not allowed';
  end if;
  if not public.is_active_giver(p_wishlist_id) then
    raise exception 'Not allowed';
  end if;
  if q = '' then
    return;
  end if;

  return query
  select i.id,
    case
      when lower(coalesce(i.title, '')) like '%' || q || '%' then 1
      when exists (
        select 1 from unnest(i.tags) t where lower(t) like q || '%'
      ) then 2
      when exists (
        select 1
        from public.wishlists w
        join public.profiles p on p.id = w.owner_id
        where w.id = i.wishlist_id
          and exists (
            select 1 from unnest(p.taste_tags) t where lower(t) like q || '%'
          )
      ) then 3
      when lower(coalesce(i.notes, '')) like '%' || q || '%' then 4
      else 99
    end as rank
  from public.wishlist_items i
  where i.wishlist_id = p_wishlist_id
    and (
      lower(coalesce(i.title, '')) like '%' || q || '%'
      or lower(coalesce(i.notes, '')) like '%' || q || '%'
      or exists (select 1 from unnest(i.tags) t where lower(t) like q || '%')
      or exists (
        select 1
        from public.wishlists w
        join public.profiles p on p.id = w.owner_id
        where w.id = i.wishlist_id
          and exists (
            select 1 from unnest(p.taste_tags) t where lower(t) like q || '%'
          )
      )
    )
  order by rank asc, i.created_at desc;
end;
$$;

grant execute on function public.search_wishlist_items(uuid, text) to authenticated;
revoke all on function public.search_wishlist_items(uuid, text) from anon, public;

comment on function public.search_wishlist_items(uuid, text) is
  'Strict giver search. Filters by title / item tags / owner taste_tags / notes. Returns id+rank only — never a tags array.';

-- Share-token path (primary). Anon may search the open link; still no tags in the payload.
create or replace function public.search_shared_wishlist_items(p_token text, p_q text)
returns setof public.shared_gift_search_hit
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  q text := lower(trim(coalesce(p_q, '')));
  resolved record;
begin
  if q = '' then
    return;
  end if;

  select * into resolved from public.resolve_share_token(p_token);
  if resolved.wishlist_id is null then
    return;
  end if;

  return query
  select i.id,
    case
      when lower(coalesce(i.title, '')) like '%' || q || '%' then 1
      when exists (
        select 1 from unnest(i.tags) t where lower(t) like q || '%'
      ) then 2
      when exists (
        select 1
        from public.wishlists w
        join public.profiles p on p.id = w.owner_id
        where w.id = i.wishlist_id
          and exists (
            select 1 from unnest(p.taste_tags) t where lower(t) like q || '%'
          )
      ) then 3
      when lower(coalesce(i.notes, '')) like '%' || q || '%' then 4
      else 99
    end as rank
  from public.wishlist_items i
  where i.wishlist_id = resolved.wishlist_id
    and (resolved.occasion_id is null or i.occasion_id = resolved.occasion_id)
    and (
      lower(coalesce(i.title, '')) like '%' || q || '%'
      or lower(coalesce(i.notes, '')) like '%' || q || '%'
      or exists (select 1 from unnest(i.tags) t where lower(t) like q || '%')
      or exists (
        select 1
        from public.wishlists w
        join public.profiles p on p.id = w.owner_id
        where w.id = i.wishlist_id
          and exists (
            select 1 from unnest(p.taste_tags) t where lower(t) like q || '%'
          )
      )
    )
  order by rank asc, i.created_at desc;
end;
$$;

grant execute on function public.search_shared_wishlist_items(text, text) to anon, authenticated;

comment on function public.search_shared_wishlist_items(text, text) is
  'Share-token giver search. Same ranking as search_wishlist_items. Payload is id+rank — no tags / taste_tags.';

-- Owner may update own taste_tags through existing profiles_update_own.
-- Do not add a giver-readable SELECT of profiles.taste_tags.
