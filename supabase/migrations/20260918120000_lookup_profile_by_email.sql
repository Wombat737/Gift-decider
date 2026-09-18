-- Exact email lookup for Add someone (not an invite). Same hit shape as handle search.
-- Never returns the email. Rate-limited with handle_search.

create or replace function public.lookup_profile_by_email(p_email text)
returns table (
  id uuid,
  handle text,
  display_name text,
  access_status text,
  can_open boolean,
  share_token text,
  is_public_link boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := lower(trim(coalesce(p_email, '')));
  found_id uuid;
begin
  if uid is null then
    raise exception 'Sign in to search';
  end if;

  -- local@dotted-domain. @handle stays on search_profiles_by_handle.
  if cleaned !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return;
  end if;

  perform public.assert_giver_social_rate('handle_search', 10, interval '10 minutes');

  select u.id into found_id
  from auth.users u
  where lower(u.email) = cleaned
  limit 1;

  if found_id is null or found_id = uid then
    return;
  end if;

  return query
  select
    p.id,
    p.handle,
    p.display_name,
    coalesce(m.status, 'none')::text as access_status,
    (
      coalesce(m.status, '') = 'active'
      and m.accepted_at is not null
    ) or coalesce(w.is_public_link, false) as can_open,
    case
      when (
        (coalesce(m.status, '') = 'active' and m.accepted_at is not null)
        or coalesce(w.is_public_link, false)
      ) then w.share_token
      else null
    end as share_token,
    coalesce(w.is_public_link, false) as is_public_link
  from public.profiles p
  left join lateral (
    select wl.*
    from public.wishlists wl
    where wl.owner_id = p.id
    order by wl.created_at asc
    limit 1
  ) w on true
  left join public.wishlist_members m
    on m.wishlist_id = w.id
   and m.user_id = uid
  where p.id = found_id;
end;
$$;

grant execute on function public.lookup_profile_by_email(text) to authenticated;
revoke all on function public.lookup_profile_by_email(text) from anon, public;

comment on function public.lookup_profile_by_email(text) is
  'Exact email match on auth.users. Same columns as handle search; never returns email. Rate-limited 10 / 10 min.';
