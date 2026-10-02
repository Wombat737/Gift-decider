-- Ready to buy follows the pledge bar.
-- A positive target_amount is met only when pledge cents reach it.
-- funded_at / the organiser email must not fire while the bar is still short.
-- No target: the honour "mark funded" stamp remains the threshold.
-- Reveal stays on reveal_at. Funded does not reveal the recipient.

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
  target numeric;
  total numeric;
begin
  if not public.shared_item_visible(p_token, p_item_id) then
    raise exception 'Wishlist item not found for that share link';
  end if;

  select i.target_amount
    into target
  from public.wishlist_items i
  where i.id = p_item_id;

  select coalesce(sum(p.amount), 0)
    into total
  from public.item_pledges p
  where p.item_id = p_item_id;

  -- Short of a positive target: leave funded_at and the ready-to-buy notice alone.
  if target is not null and target > 0 and total < target then
    select *
      into result
    from public.wishlist_items
    where id = p_item_id;
    return result;
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

comment on function public.mark_shared_item_funded(text, uuid) is
  'Honour mark. With a positive target, no-ops until pledges reach it. Does not reveal the recipient.';
