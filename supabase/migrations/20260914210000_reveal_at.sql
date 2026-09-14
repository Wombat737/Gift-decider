-- Group gifts: owner reveal is gated by reveal_at, not by funded_at.
-- Givers still see pledge progress / funded among themselves.
-- Surprise-safe: owners must not see funded, contributor names, or “from the group”
-- until current_date >= reveal_at (and the item is a group gift).

alter table public.wishlist_items
  add column if not exists reveal_at date;

create index if not exists wishlist_items_reveal_at_idx
  on public.wishlist_items (reveal_at)
  where reveal_at is not null;

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
     or new.reveal_at is distinct from old.reveal_at
  then
    if current_setting('giftdecider.giver_rpc', true) = '1' then
      return new;
    end if;
    raise exception 'Viewers can only update reserve / purchased / group-gift fields';
  end if;

  return new;
end;
$$;

drop function if exists public.set_shared_item_group_gift(text, uuid, boolean);

create function public.set_shared_item_group_gift(
  p_token text,
  p_item_id uuid,
  p_is_group_gift boolean,
  p_reveal_at date default null
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

  if p_is_group_gift and p_reveal_at is null then
    raise exception 'Pick a reveal date';
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set
    is_group_gift = p_is_group_gift,
    reveal_at = case
      when p_is_group_gift then p_reveal_at
      else null
    end
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_shared_item_reveal_at(
  p_token text,
  p_item_id uuid,
  p_reveal_at date
)
returns public.wishlist_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wishlist_items;
begin
  if p_reveal_at is null then
    raise exception 'Pick a reveal date';
  end if;

  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set
    is_group_gift = true,
    reveal_at = p_reveal_at
  where id = p_item_id
  returning * into result;

  return result;
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
  set
    is_group_gift = true,
    reveal_at = coalesce(reveal_at, current_date + 1)
  where id = p_item_id;

  insert into public.item_pledges (item_id, amount, display_name)
  values (p_item_id, round(p_amount, 2), nullif(trim(p_display_name), ''))
  returning * into result;

  perform public.maybe_fund_item(p_item_id);

  return result;
end;
$$;

-- Names only, and only after the reveal date. Never returns amounts. Funded is not enough.
drop function if exists public.list_owned_funded_contributors();

create function public.list_owned_revealed_contributors()
returns table (
  item_id uuid,
  display_name text,
  reveal_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id as item_id,
    case
      when p.id is null then null
      else coalesce(nullif(trim(p.display_name), ''), 'Anonymous')
    end as display_name,
    i.reveal_at
  from public.wishlist_items i
  join public.wishlists w on w.id = i.wishlist_id
  left join public.item_pledges p on p.item_id = i.id
  where w.owner_id = auth.uid()
    and i.is_group_gift = true
    and i.reveal_at is not null
    and current_date >= i.reveal_at
  order by p.created_at asc nulls first;
$$;

grant execute on function public.set_shared_item_group_gift(text, uuid, boolean, date) to anon, authenticated;
grant execute on function public.set_shared_item_reveal_at(text, uuid, date) to anon, authenticated;
grant execute on function public.list_owned_revealed_contributors() to authenticated;

comment on column public.wishlist_items.reveal_at is
  'Calendar date when the owner may see who chipped in. Funded_at does not reveal.';
