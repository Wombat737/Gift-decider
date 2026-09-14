-- Organiser + honour-system buy flow. Owner still surprise-safe until reveal_at.
-- Gift Decider holds no money. Push notifications are out of scope.

alter table public.wishlist_items
  add column if not exists organiser_name text,
  add column if not exists pay_instructions text,
  add column if not exists delivery_method text
    check (delivery_method is null or delivery_method in ('to_organiser', 'collect', 'other')),
  add column if not exists delivery_note text,
  add column if not exists ready_to_buy_notified_at timestamptz;

create table if not exists public.organiser_notices (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.wishlist_items (id) on delete cascade,
  kind text not null default 'ready_to_buy',
  title text not null,
  body text not null,
  email_preview text not null,
  created_at timestamptz not null default now()
);

create index if not exists organiser_notices_item_id_idx on public.organiser_notices (item_id);

alter table public.organiser_notices enable row level security;

-- Notices are giver-only (same surprise-safe rule as pledges).
create policy organiser_notices_member_select
  on public.organiser_notices for select
  to authenticated
  using (
    public.is_accepted_member((select wishlist_id from public.wishlist_items i where i.id = item_id))
    and not public.is_wishlist_owner((select wishlist_id from public.wishlist_items i where i.id = item_id))
  );

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
     or new.organiser_name is distinct from old.organiser_name
     or new.pay_instructions is distinct from old.pay_instructions
     or new.delivery_method is distinct from old.delivery_method
     or new.delivery_note is distinct from old.delivery_note
     or new.ready_to_buy_notified_at is distinct from old.ready_to_buy_notified_at
  then
    if current_setting('giftdecider.giver_rpc', true) = '1' then
      return new;
    end if;
    raise exception 'Viewers can only update reserve / purchased / group-gift fields';
  end if;

  return new;
end;
$$;

create or replace function public.record_ready_to_buy_notice(p_item_id uuid)
returns public.organiser_notices
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.wishlist_items;
  preview text;
  result public.organiser_notices;
begin
  select * into item from public.wishlist_items where id = p_item_id;
  if item.id is null then
    raise exception 'Item not found';
  end if;
  if item.ready_to_buy_notified_at is not null then
    select * into result
    from public.organiser_notices
    where item_id = p_item_id and kind = 'ready_to_buy'
    order by created_at desc
    limit 1;
    return result;
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

  preview := concat_ws(
    E'\n',
    'Subject: Funded — time to buy ' || coalesce(item.title, 'the group gift'),
    '',
    'Hi ' || coalesce(nullif(trim(item.organiser_name), ''), 'Organiser') || ',',
    '',
    'The group gift is funded. Gift Decider holds no money — honour system.',
    'How givers pay you: ' || coalesce(nullif(trim(item.pay_instructions), ''), '(no PayID / BSB note yet)'),
    'They see who chipped in on ' || coalesce(item.reveal_at::text, 'the reveal date') || ' — not today.'
  );

  insert into public.organiser_notices (item_id, kind, title, body, email_preview)
  values (
    p_item_id,
    'ready_to_buy',
    'Funded — time to buy',
    'Pledges hit the target. Buy it, then mark purchased and pick delivery. The recipient still will not see who chipped in until the reveal date.',
    preview
  )
  returning * into result;

  update public.wishlist_items
  set ready_to_buy_notified_at = now()
  where id = p_item_id
    and ready_to_buy_notified_at is null;

  return result;
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
    perform public.record_ready_to_buy_notice(p_item_id);
  end if;
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

  perform public.record_ready_to_buy_notice(p_item_id);

  return result;
end;
$$;

drop function if exists public.set_shared_item_group_gift(text, uuid, boolean, date);

create function public.set_shared_item_group_gift(
  p_token text,
  p_item_id uuid,
  p_is_group_gift boolean,
  p_reveal_at date default null,
  p_organiser_name text default null,
  p_pay_instructions text default null
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
    reveal_at = case when p_is_group_gift then p_reveal_at else null end,
    organiser_name = case
      when p_is_group_gift then coalesce(nullif(trim(p_organiser_name), ''), organiser_name)
      else null
    end,
    pay_instructions = case
      when p_is_group_gift then coalesce(nullif(trim(p_pay_instructions), ''), pay_instructions)
      else null
    end
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_shared_item_organiser(
  p_token text,
  p_item_id uuid,
  p_organiser_name text
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
  if nullif(trim(p_organiser_name), '') is null then
    raise exception 'Name the organiser';
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set
    is_group_gift = true,
    organiser_name = trim(p_organiser_name)
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_shared_item_pay_instructions(
  p_token text,
  p_item_id uuid,
  p_pay_instructions text
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
  set pay_instructions = nullif(trim(p_pay_instructions), '')
  where id = p_item_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.set_shared_item_delivery(
  p_token text,
  p_item_id uuid,
  p_delivery_method text,
  p_delivery_note text default null
)
returns public.wishlist_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wishlist_items;
begin
  if p_delivery_method is null or p_delivery_method not in ('to_organiser', 'collect', 'other') then
    raise exception 'Pick a delivery method';
  end if;

  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  perform set_config('giftdecider.giver_rpc', '1', true);

  update public.wishlist_items
  set
    delivery_method = p_delivery_method,
    delivery_note = nullif(trim(p_delivery_note), '')
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
    reveal_at = coalesce(reveal_at, current_date + 1),
    organiser_name = coalesce(organiser_name, nullif(trim(p_display_name), ''))
  where id = p_item_id;

  insert into public.item_pledges (item_id, amount, display_name)
  values (p_item_id, round(p_amount, 2), nullif(trim(p_display_name), ''))
  returning * into result;

  perform public.maybe_fund_item(p_item_id);

  return result;
end;
$$;

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
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by n.created_at desc;
$$;

grant execute on function public.set_shared_item_group_gift(text, uuid, boolean, date, text, text) to anon, authenticated;
grant execute on function public.set_shared_item_organiser(text, uuid, text) to anon, authenticated;
grant execute on function public.set_shared_item_pay_instructions(text, uuid, text) to anon, authenticated;
grant execute on function public.set_shared_item_delivery(text, uuid, text, text) to anon, authenticated;
grant execute on function public.list_shared_organiser_notices(text) to anon, authenticated;

revoke all on function public.record_ready_to_buy_notice(uuid) from public, anon, authenticated;

comment on column public.wishlist_items.organiser_name is
  'Giver who buys. Default: who marked group gift, else first named pledge.';
comment on column public.wishlist_items.pay_instructions is
  'PayID / BSB / how to pay the organiser. Givers only. App holds no money.';
