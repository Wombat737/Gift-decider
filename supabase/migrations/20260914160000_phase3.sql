-- Gift Decider Phase 3: funded reveal, dead-link flag, owner names only after funded.
-- Surprise-safe: owners still must not see reserve / purchase / pledge amounts / unfunded chip-in.

alter table public.wishlist_items
  add column if not exists funded_at timestamptz,
  add column if not exists buy_url_dead boolean not null default false;

create index if not exists wishlist_items_funded_at_idx
  on public.wishlist_items (funded_at)
  where funded_at is not null;

-- Viewers still cannot edit catalog fields. Giver RPCs set funded_at / buy_url_dead.
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
     or new.funded_at is distinct from old.funded_at
     or new.buy_url_dead is distinct from old.buy_url_dead
  then
    if current_setting('giftdecider.giver_rpc', true) = '1' then
      return new;
    end if;
    raise exception 'Viewers can only update reserve / purchased / group-gift fields';
  end if;

  return new;
end;
$$;

create or replace function public.maybe_fund_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target numeric;
  already timestamptz;
  total numeric;
begin
  select i.target_amount, i.funded_at
    into target, already
  from public.wishlist_items i
  where i.id = p_item_id;

  if already is not null then
    return;
  end if;
  if target is null or target <= 0 then
    return;
  end if;

  select coalesce(sum(p.amount), 0) into total
  from public.item_pledges p
  where p.item_id = p_item_id;

  if total >= target then
    perform set_config('giftdecider.giver_rpc', '1', true);
    update public.wishlist_items
    set funded_at = now(), is_group_gift = true
    where id = p_item_id
      and funded_at is null;
  end if;
end;
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

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set is_group_gift = true
  where id = p_item_id;

  insert into public.item_pledges (item_id, amount, display_name)
  values (p_item_id, round(p_amount, 2), nullif(trim(p_display_name), ''))
  returning * into result;

  perform public.maybe_fund_item(p_item_id);

  return result;
end;
$$;

create or replace function public.mark_shared_item_funded(
  p_token text,
  p_item_id uuid
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

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set
    is_group_gift = true,
    funded_at = coalesce(funded_at, now())
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_shared_item_link_dead(
  p_token text,
  p_item_id uuid,
  p_dead boolean
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

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set buy_url_dead = p_dead
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

-- Names only, and only for the owner's funded items. Never returns amounts.
create or replace function public.list_owned_funded_contributors()
returns table (
  item_id uuid,
  display_name text,
  funded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.item_id,
    coalesce(nullif(trim(p.display_name), ''), 'Anonymous') as display_name,
    i.funded_at
  from public.item_pledges p
  join public.wishlist_items i on i.id = p.item_id
  join public.wishlists w on w.id = i.wishlist_id
  where w.owner_id = auth.uid()
    and i.funded_at is not null
  order by p.created_at asc;
$$;

grant execute on function public.mark_shared_item_funded(text, uuid) to anon, authenticated;
grant execute on function public.set_shared_item_link_dead(text, uuid, boolean) to anon, authenticated;
grant execute on function public.list_owned_funded_contributors() to authenticated;

revoke all on function public.maybe_fund_item(uuid) from public, anon, authenticated;

-- Owners still have no direct SELECT on item_pledges. The RPC above is the
-- only path, and it requires funded_at. Keep member policies from Phase 2.
