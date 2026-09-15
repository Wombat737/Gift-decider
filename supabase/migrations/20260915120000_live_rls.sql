-- Live mode: surprise-safe column RLS, workspace bootstrap, organiser notice grants.
-- Recipients must not SELECT reserved / purchased / funded / contributor / heal columns.
-- Givers keep those fields via share-token SECURITY DEFINER RPCs.
--
-- OWNER_ITEM_COLUMNS: id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at, updated_at
-- GIVER_ONLY_ITEM_COLUMNS: status, reserved_by, reserved_at, is_group_gift, funded_at, reveal_at, buy_url_dead, organiser_name, pay_instructions, delivery_method, delivery_note, ready_to_buy_notified_at

-- ---------------------------------------------------------------------------
-- Column-level SELECT: authenticated owners (and members) cannot read spoilers
-- from PostgREST. Giver RPCs are SECURITY DEFINER and still see every column.
-- ---------------------------------------------------------------------------

revoke select on public.wishlist_items from authenticated;

grant select (
  id,
  wishlist_id,
  image_path,
  image_url,
  title,
  notes,
  source_type,
  source_url,
  buy_url,
  tags,
  item_kind,
  size_hint,
  target_amount,
  occasion_id,
  no_substitution,
  created_at,
  updated_at
) on public.wishlist_items to authenticated;

comment on column public.wishlist_items.status is
  'Giver-only. Recipients have no SELECT privilege; share-token RPCs still return it to givers.';
comment on column public.wishlist_items.reserved_by is
  'Giver-only. Never exposed to the recipient.';
comment on column public.wishlist_items.reserved_at is
  'Giver-only. Never exposed to the recipient.';
comment on column public.wishlist_items.is_group_gift is
  'Giver-only until reveal. Owners learn “from the group” via list_owned_revealed_contributors.';
comment on column public.wishlist_items.funded_at is
  'Giver-only. Funded does not reveal to the recipient.';
comment on column public.wishlist_items.reveal_at is
  'Giver-only on the item row. Owners receive the date only through list_owned_revealed_contributors after current_date >= reveal_at.';
comment on column public.wishlist_items.buy_url_dead is
  'Giver-only dead-link heal flag. Recipients have no SELECT privilege.';
comment on column public.wishlist_items.organiser_name is
  'Giver-only.';
comment on column public.wishlist_items.pay_instructions is
  'Giver-only PayID / BSB. Recipients have no SELECT privilege.';
comment on column public.wishlist_items.delivery_method is
  'Giver-only.';
comment on column public.wishlist_items.delivery_note is
  'Giver-only.';
comment on column public.wishlist_items.ready_to_buy_notified_at is
  'Giver-only.';

-- Owner-facing catalog view (same columns as the GRANT). security_invoker keeps RLS.
create or replace view public.owner_wishlist_items
with (security_invoker = true) as
select
  id,
  wishlist_id,
  image_path,
  image_url,
  title,
  notes,
  source_type,
  source_url,
  buy_url,
  tags,
  item_kind,
  size_hint,
  target_amount,
  occasion_id,
  no_substitution,
  created_at,
  updated_at
from public.wishlist_items;

grant select on public.owner_wishlist_items to authenticated;

comment on view public.owner_wishlist_items is
  'Surprise-safe owner catalog. No reserve / purchase / funded / heal / organiser columns.';

-- Organiser notices were missing table GRANT (RLS already blocks owners).
grant select on public.organiser_notices to authenticated;

-- ---------------------------------------------------------------------------
-- Owners cannot write giver-only columns (INSERT or UPDATE).
-- Giver RPCs set giftdecider.giver_rpc so they can still update those fields.
-- ---------------------------------------------------------------------------

create or replace function public.protect_item_giver_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('giftdecider.giver_rpc', true) = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_wishlist_owner(new.wishlist_id) then
      raise exception 'Only the owner can add wishlist items';
    end if;
    new.status := 'available';
    new.reserved_by := null;
    new.reserved_at := null;
    new.is_group_gift := false;
    new.funded_at := null;
    new.reveal_at := null;
    new.buy_url_dead := false;
    new.organiser_name := null;
    new.pay_instructions := null;
    new.delivery_method := null;
    new.delivery_note := null;
    new.ready_to_buy_notified_at := null;
    return new;
  end if;

  if public.is_wishlist_owner(new.wishlist_id) then
    new.status := old.status;
    new.reserved_by := old.reserved_by;
    new.reserved_at := old.reserved_at;
    new.is_group_gift := old.is_group_gift;
    new.funded_at := old.funded_at;
    new.reveal_at := old.reveal_at;
    new.buy_url_dead := old.buy_url_dead;
    new.organiser_name := old.organiser_name;
    new.pay_instructions := old.pay_instructions;
    new.delivery_method := old.delivery_method;
    new.delivery_note := old.delivery_note;
    new.ready_to_buy_notified_at := old.ready_to_buy_notified_at;
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
     or new.funded_at is distinct from old.funded_at
     or new.buy_url_dead is distinct from old.buy_url_dead
     or new.reveal_at is distinct from old.reveal_at
     or new.organiser_name is distinct from old.organiser_name
     or new.pay_instructions is distinct from old.pay_instructions
     or new.delivery_method is distinct from old.delivery_method
     or new.delivery_note is distinct from old.delivery_note
     or new.ready_to_buy_notified_at is distinct from old.ready_to_buy_notified_at
  then
    raise exception 'Viewers can only update reserve / purchased / group-gift fields';
  end if;

  return new;
end;
$$;

drop trigger if exists wishlist_items_protect_giver_columns on public.wishlist_items;

create trigger wishlist_items_protect_giver_columns
  before insert or update on public.wishlist_items
  for each row execute function public.protect_item_giver_columns();

-- ---------------------------------------------------------------------------
-- First live login: profile + default wishlist if the auth trigger missed them.
-- ---------------------------------------------------------------------------

create or replace function public.ensure_own_workspace()
returns table (
  wishlist_id uuid,
  share_token text,
  title text,
  owner_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  email text := coalesce(auth.jwt() ->> 'email', 'friend');
  wl public.wishlists;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  insert into public.profiles (id, display_name, locale)
  values (
    uid,
    split_part(email, '@', 1),
    'en-AU'
  )
  on conflict (id) do nothing;

  select * into wl
  from public.wishlists w
  where w.owner_id = uid
  order by w.created_at asc
  limit 1;

  if wl.id is null then
    insert into public.wishlists (owner_id, title)
    values (uid, 'My wishlist')
    returning * into wl;
  end if;

  return query
  select wl.id, wl.share_token, wl.title, wl.owner_id;
end;
$$;

grant execute on function public.ensure_own_workspace() to authenticated;
revoke all on function public.ensure_own_workspace() from anon, public;
