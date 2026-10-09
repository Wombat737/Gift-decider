-- Surprise-safe owner preview.
-- Share-token RPCs must not return reservation, purchase, funding, pledge,
-- organiser, or giver-name fields when auth.uid() owns the wishlist.
-- Direct SELECT already hides those columns (live_rls) and comments already
-- deny the owner. This closes the security-definer share-token path.
-- Givers (including anonymous link holders) still receive the full payload.

create or replace function public.caller_owns_share_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.resolve_share_token(p_token) r
      join public.wishlists w on w.id = r.wishlist_id
      where w.owner_id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.caller_owns_share_token(text) from public, anon, authenticated;

comment on function public.caller_owns_share_token(text) is
  'True when the signed-in user owns the wishlist behind a share or occasion token.';

-- List rows for the owner look available: no status, names, pledges, or funding.
create or replace function public.mask_shared_gift_item(gift public.shared_gift_item)
returns public.shared_gift_item
language plpgsql
immutable
as $$
begin
  gift.status := 'available';
  gift.reserved_by := null;
  gift.reserved_at := null;
  gift.is_group_gift := false;
  gift.funded_at := null;
  gift.buy_url_dead := false;
  gift.reveal_at := null;
  gift.organiser_name := null;
  gift.pay_instructions := null;
  gift.delivery_method := null;
  gift.delivery_note := null;
  gift.ready_to_buy_notified_at := null;
  return gift;
end;
$$;

revoke all on function public.mask_shared_gift_item(public.shared_gift_item) from public, anon, authenticated;

-- Named columns, not wishlist_items::shared_gift_item. A whole-row cast fails
-- once the table has extra or dropped columns (live schema).
create or replace function public.wishlist_item_to_shared(src public.wishlist_items)
returns public.shared_gift_item
language sql
immutable
as $$
  select (
    src.id,
    src.wishlist_id,
    src.image_path,
    src.image_url,
    src.title,
    src.notes,
    src.source_type,
    src.source_url,
    src.buy_url,
    src.tags,
    src.no_substitution,
    src.status,
    src.reserved_by,
    src.reserved_at,
    src.created_at,
    src.updated_at,
    src.item_kind,
    src.size_hint,
    src.target_amount,
    src.occasion_id,
    src.is_group_gift,
    src.funded_at,
    src.buy_url_dead,
    src.reveal_at,
    src.organiser_name,
    src.pay_instructions,
    src.delivery_method,
    src.delivery_note,
    src.ready_to_buy_notified_at
  )::public.shared_gift_item;
$$;

revoke all on function public.wishlist_item_to_shared(public.wishlist_items) from public, anon, authenticated;

create or replace function public.get_shared_wishlist_items(p_token text)
returns setof public.shared_gift_item
language sql
volatile
security definer
set search_path = public
as $$
  select case
    when public.caller_owns_share_token(p_token)
      then public.mask_shared_gift_item(public.wishlist_item_to_shared(i))
    else public.wishlist_item_to_shared(i)
  end
  from public.wishlist_items i
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by i.created_at desc;
$$;

grant execute on function public.get_shared_wishlist_items(text) to anon, authenticated;

comment on function public.get_shared_wishlist_items(text) is
  'Giver catalog. When the caller owns the list, spoiler columns are cleared.';

-- Pledges: owners get zero rows (names and amounts). RLS already blocks direct SELECT.
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
  where not public.caller_owns_share_token(p_token)
    and (r.occasion_id is null or i.occasion_id = r.occasion_id)
  order by p.created_at asc;
$$;

grant execute on function public.list_shared_item_pledges(text) to anon, authenticated;

comment on function public.list_shared_item_pledges(text) is
  'Giver pledges. Empty when the caller owns the wishlist.';

create or replace function public.list_shared_organiser_notices(p_token text)
returns setof public.organiser_notices
language sql
stable
security definer
set search_path = public
as $$
  select n.*
  from public.organiser_notices n
  join public.wishlist_items i on i.id = n.item_id
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where not public.caller_owns_share_token(p_token)
    and (r.occasion_id is null or i.occasion_id = r.occasion_id)
  order by n.created_at desc;
$$;

grant execute on function public.list_shared_organiser_notices(text) to anon, authenticated;

comment on function public.list_shared_organiser_notices(text) is
  'Organiser notices. Empty when the caller owns the wishlist.';

-- Owner must not receive the shared_gift_item row from a status write.
create or replace function public.set_shared_item_status(
  p_token text,
  p_item_id uuid,
  p_status public.item_status,
  p_reserved_by text default null
)
returns public.shared_gift_item
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wishlist_items;
begin
  if public.caller_owns_share_token(p_token) then
    raise exception 'List owners cannot change giver activity on their own list';
  end if;

  if p_status not in ('available', 'reserved', 'purchased') then
    raise exception 'Invalid status';
  end if;

  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

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

  return public.wishlist_item_to_shared(result);
end;
$$;

grant execute on function public.set_shared_item_status(text, uuid, public.item_status, text) to anon, authenticated;

-- Other share-token writes return wishlist_items. Stop them for the owner so
-- the function never returns organiser, pledge, or reservation fields.
create or replace function public.protect_item_giver_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('giftdecider.giver_rpc', true) = '1' then
    if public.is_wishlist_owner(new.wishlist_id) then
      raise exception 'List owners cannot change giver activity on their own list';
    end if;
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

-- Pledge inserts from share-token RPCs (they set giftdecider.giver_rpc).
create or replace function public.reject_owner_giver_pledge()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  wid uuid;
begin
  if current_setting('giftdecider.giver_rpc', true) is distinct from '1' then
    return new;
  end if;

  select i.wishlist_id into wid
  from public.wishlist_items i
  where i.id = new.item_id;

  if wid is not null and public.is_wishlist_owner(wid) then
    raise exception 'List owners cannot change giver activity on their own list';
  end if;

  return new;
end;
$$;

drop trigger if exists item_pledges_reject_owner on public.item_pledges;

create trigger item_pledges_reject_owner
  before insert or update on public.item_pledges
  for each row execute function public.reject_owner_giver_pledge();

revoke all on function public.reject_owner_giver_pledge() from public, anon, authenticated;
