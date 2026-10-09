-- Giver status chips: share-token RPCs must (1) actually persist reserve/purchase
-- while the live RLS trigger is installed, and (2) return status to the caller.
--
-- protect_item_giver_columns freezes status unless giftdecider.giver_rpc = 1.
-- set_shared_item_status never set that flag, so a signed-in owner testing their
-- own giver link (and any path that hits is_wishlist_owner) kept Open.
--
-- PostgREST also applies invoker column privileges to RETURNS wishlist_items.
-- Authenticated roles have no SELECT on status, so the JSON omitted it and the
-- giver list/item badge stayed Open. Return a dedicated composite instead.

-- Project columns by name. wishlist_items.target_amount is numeric(12,2);
-- a whole-row cast to this type fails (numeric typmod, and any later column drift).
create type public.shared_gift_item as (
  id uuid,
  wishlist_id uuid,
  image_path text,
  image_url text,
  title text,
  notes text,
  source_type public.item_source_type,
  source_url text,
  buy_url text,
  tags text[],
  no_substitution boolean,
  status public.item_status,
  reserved_by text,
  reserved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  item_kind public.item_kind,
  size_hint text,
  target_amount numeric,
  occasion_id uuid,
  is_group_gift boolean,
  funded_at timestamptz,
  buy_url_dead boolean,
  reveal_at date,
  organiser_name text,
  pay_instructions text,
  delivery_method text,
  delivery_note text,
  ready_to_buy_notified_at timestamptz
);

grant usage on type public.shared_gift_item to anon, authenticated;

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

drop function if exists public.get_shared_wishlist_items(text);

create function public.get_shared_wishlist_items(p_token text)
returns setof public.shared_gift_item
language sql
stable
security definer
set search_path = public
as $$
  select public.wishlist_item_to_shared(i)
  from public.wishlist_items i
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by i.created_at desc;
$$;

drop function if exists public.set_shared_item_status(text, uuid, public.item_status, text);

create function public.set_shared_item_status(
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

grant execute on function public.get_shared_wishlist_items(text) to anon, authenticated;
grant execute on function public.set_shared_item_status(text, uuid, public.item_status, text) to anon, authenticated;

comment on type public.shared_gift_item is
  'Giver share-token payload. Includes status so Taken/Bought chips are not stripped by wishlist_items column grants.';
