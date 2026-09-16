-- Live giver list refresh: get_shared_wishlist_items must see the row that
-- set_shared_item_status just wrote. STABLE can reuse a snapshot on a pooled
-- connection, so a silent focus refresh after Mark purchased returned the
-- previous reserved row and the client list stayed Taken until a full reload.

create or replace function public.get_shared_wishlist_items(p_token text)
returns setof public.shared_gift_item
language sql
volatile
security definer
set search_path = public
as $$
  select i::public.shared_gift_item
  from public.wishlist_items i
  join public.resolve_share_token(p_token) r on r.wishlist_id = i.wishlist_id
  where r.occasion_id is null or i.occasion_id = r.occasion_id
  order by i.created_at desc;
$$;

grant execute on function public.get_shared_wishlist_items(text) to anon, authenticated;
