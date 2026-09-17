-- Giver social A — foundations.
-- Handle search + email invite + private pins. Share links stay primary.
-- Pin is free; opening wishlist items still needs accept OR share-token / public-link.

-- ---------------------------------------------------------------------------
-- profiles.discoverability: private | handle (default handle)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists discoverability text not null default 'handle';

alter table public.profiles
  drop constraint if exists profiles_discoverability_check;

alter table public.profiles
  add constraint profiles_discoverability_check
  check (discoverability in ('private', 'handle'));

comment on column public.profiles.discoverability is
  'handle = findable by exact/prefix handle only. private = share link only. Never searchable by display name.';

create index if not exists profiles_handle_lower_idx
  on public.profiles (lower(handle));

-- Optional: recipient can mark the default list as open without a request.
alter table public.wishlists
  add column if not exists is_public_link boolean not null default false;

comment on column public.wishlists.is_public_link is
  'If true, handle search may open the list without an access request. Share-token path always works. Default false.';

-- ---------------------------------------------------------------------------
-- wishlist_members.status — access gate (pin is separate)
-- ---------------------------------------------------------------------------

alter table public.wishlist_members
  add column if not exists status text not null default 'active';

alter table public.wishlist_members
  drop constraint if exists wishlist_members_status_check;

alter table public.wishlist_members
  add constraint wishlist_members_status_check
  check (status in ('active', 'pending_request', 'declined', 'revoked', 'blocked'));

alter table public.wishlist_members
  add column if not exists requested_by uuid references public.profiles (id) on delete set null;

alter table public.wishlist_members
  add column if not exists responded_at timestamptz;

comment on column public.wishlist_members.status is
  'active givers may read items. pending_request / declined / revoked / blocked cannot. Share-token RPCs are unchanged.';

-- Existing accepted members stay active. Unclaimed owner email invites keep
-- accepted_at null so is_accepted_member still fails until they claim.
update public.wishlist_members
set status = 'active'
where accepted_at is not null
  and status is distinct from 'active';

-- Accepted membership now also requires status = active (pending_request cannot read items).
create or replace function public.is_accepted_member(p_wishlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wishlist_members m
    where m.wishlist_id = p_wishlist_id
      and m.user_id = auth.uid()
      and m.accepted_at is not null
      and m.status = 'active'
  );
$$;

-- Active giver on a list, never the owner (comments / membership search).
create or replace function public.is_active_giver(p_wishlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_accepted_member(p_wishlist_id)
     and not public.is_wishlist_owner(p_wishlist_id);
$$;

grant execute on function public.is_active_giver(uuid) to authenticated;
revoke all on function public.is_active_giver(uuid) from anon, public;

-- ---------------------------------------------------------------------------
-- giver_people — private pin on the giver's home (no recipient consent needed)
-- ---------------------------------------------------------------------------

create table if not exists public.giver_people (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  wishlist_id uuid references public.wishlists (id) on delete set null,
  label text,
  created_at timestamptz not null default now(),
  unique (giver_id, recipient_id),
  constraint giver_people_not_self check (giver_id <> recipient_id)
);

create index if not exists giver_people_giver_id_idx on public.giver_people (giver_id);

comment on table public.giver_people is
  'Private “People I buy for” pins. Deleting a pin does not revoke membership.';

alter table public.giver_people enable row level security;

drop policy if exists giver_people_own_all on public.giver_people;
create policy giver_people_own_all
  on public.giver_people for all
  to authenticated
  using (giver_id = auth.uid())
  with check (giver_id = auth.uid());

grant select, insert, update, delete on public.giver_people to authenticated;
revoke all on public.giver_people from anon, public;

-- ---------------------------------------------------------------------------
-- Blocks + outbound email stubs + rate-limit events
-- ---------------------------------------------------------------------------

create table if not exists public.giver_blocks (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  giver_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, giver_id),
  constraint giver_blocks_not_self check (owner_id <> giver_id)
);

comment on table public.giver_blocks is
  'Recipient blocked this giver. Future access requests from the same uid are ignored.';

alter table public.giver_blocks enable row level security;

drop policy if exists giver_blocks_owner_all on public.giver_blocks;
create policy giver_blocks_owner_all
  on public.giver_blocks for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.giver_blocks to authenticated;
revoke all on public.giver_blocks from anon, public;

create table if not exists public.giver_email_invites (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create unique index if not exists giver_email_invites_open_uidx
  on public.giver_email_invites (giver_id, lower(email))
  where claimed_at is null;

comment on table public.giver_email_invites is
  'Giver-outbound email invite stub. Scaffold does not send mail (same as owner inviteByEmail).';

alter table public.giver_email_invites enable row level security;

drop policy if exists giver_email_invites_own_all on public.giver_email_invites;
create policy giver_email_invites_own_all
  on public.giver_email_invites for all
  to authenticated
  using (giver_id = auth.uid())
  with check (giver_id = auth.uid());

grant select, insert, update, delete on public.giver_email_invites to authenticated;
revoke all on public.giver_email_invites from anon, public;

create table if not exists public.giver_social_rate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('handle_search', 'access_request', 'email_invite')),
  created_at timestamptz not null default now()
);

create index if not exists giver_social_rate_events_user_kind_idx
  on public.giver_social_rate_events (user_id, kind, created_at desc);

alter table public.giver_social_rate_events enable row level security;
-- No policies: only security-definer RPCs write/read this table.
revoke all on public.giver_social_rate_events from anon, authenticated, public;

create or replace function public.assert_giver_social_rate(
  p_kind text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'Sign in to do that';
  end if;

  delete from public.giver_social_rate_events
  where created_at < now() - interval '2 days';

  select count(*) into n
  from public.giver_social_rate_events e
  where e.user_id = uid
    and e.kind = p_kind
    and e.created_at >= now() - p_window;

  if n >= p_limit then
    raise exception 'Slow down — try again later';
  end if;

  insert into public.giver_social_rate_events (user_id, kind)
  values (uid, p_kind);
end;
$$;

revoke all on function public.assert_giver_social_rate(text, integer, interval) from public, anon, authenticated;

create or replace function public.recipient_default_wishlist(p_recipient_id uuid)
returns public.wishlists
language sql
stable
security definer
set search_path = public
as $$
  select w.*
  from public.wishlists w
  where w.owner_id = p_recipient_id
  order by w.created_at asc
  limit 1;
$$;

revoke all on function public.recipient_default_wishlist(uuid) from public, anon, authenticated;

create or replace function public.pin_giver_person(
  p_recipient_id uuid,
  p_wishlist_id uuid default null,
  p_label text default null
)
returns public.giver_people
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wl public.wishlists;
  result public.giver_people;
  clean_label text := nullif(trim(coalesce(p_label, '')), '');
begin
  if uid is null then
    raise exception 'Sign in to pin someone';
  end if;
  if p_recipient_id = uid then
    raise exception 'You cannot pin yourself';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_recipient_id) then
    raise exception 'No one matches that handle';
  end if;

  wl := public.recipient_default_wishlist(p_recipient_id);
  if p_wishlist_id is not null then
    select * into wl from public.wishlists w where w.id = p_wishlist_id and w.owner_id = p_recipient_id;
  end if;

  insert into public.giver_people (giver_id, recipient_id, wishlist_id, label)
  values (uid, p_recipient_id, wl.id, clean_label)
  on conflict (giver_id, recipient_id) do update
    set label = coalesce(excluded.label, public.giver_people.label),
        wishlist_id = coalesce(excluded.wishlist_id, public.giver_people.wishlist_id)
  returning * into result;

  return result;
end;
$$;

grant execute on function public.pin_giver_person(uuid, uuid, text) to authenticated;
revoke all on function public.pin_giver_person(uuid, uuid, text) from anon, public;

-- ---------------------------------------------------------------------------
-- Handle search — exact/prefix on handle, never display name, never email
-- ---------------------------------------------------------------------------

create or replace function public.search_profiles_by_handle(p_q text)
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
  q text := lower(trim(both from coalesce(p_q, '')));
begin
  if uid is null then
    raise exception 'Sign in to search handles';
  end if;

  q := regexp_replace(q, '^@+', '');
  if length(q) < 2 then
    return;
  end if;

  perform public.assert_giver_social_rate('handle_search', 10, interval '10 minutes');

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
  where p.discoverability = 'handle'
    and p.handle is not null
    and p.id <> uid
    and (
      lower(p.handle) = q
      or lower(p.handle) like q || '%'
    )
    -- Explicit: never match display_name.
    and lower(p.handle) like q || '%'
  order by
    (lower(p.handle) = q) desc,
    lower(p.handle) asc
  limit 8;
end;
$$;

grant execute on function public.search_profiles_by_handle(text) to authenticated;
revoke all on function public.search_profiles_by_handle(text) from anon, public;

comment on function public.search_profiles_by_handle(text) is
  'Discoverability=handle only. Prefix/exact on handle. Strips email and taste_tags. Rate-limited 10 / 10 min.';

-- ---------------------------------------------------------------------------
-- Request / respond access
-- ---------------------------------------------------------------------------

create or replace function public.request_giver_access(p_recipient_id uuid)
returns table (
  member_id uuid,
  status text,
  pin_id uuid,
  share_token text,
  can_open boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wl public.wishlists;
  blocked boolean;
  member public.wishlist_members;
  pin public.giver_people;
begin
  if uid is null then
    raise exception 'Sign in to request access';
  end if;
  if p_recipient_id = uid then
    raise exception 'That is your own list';
  end if;

  perform public.assert_giver_social_rate('access_request', 5, interval '1 day');

  select exists (
    select 1 from public.giver_blocks b
    where b.owner_id = p_recipient_id and b.giver_id = uid
  ) into blocked;
  if blocked then
    raise exception 'This person is not accepting requests from you';
  end if;

  wl := public.recipient_default_wishlist(p_recipient_id);
  if wl.id is null then
    raise exception 'They do not have a list yet';
  end if;

  pin := public.pin_giver_person(p_recipient_id, wl.id, null);

  select * into member
  from public.wishlist_members m
  where m.wishlist_id = wl.id and m.user_id = uid;

  if wl.is_public_link then
    if member.id is null then
      insert into public.wishlist_members (
        wishlist_id, user_id, role, status, requested_by, accepted_at, responded_at
      ) values (
        wl.id, uid, 'viewer', 'active', uid, now(), now()
      )
      returning * into member;
    else
      update public.wishlist_members m
      set status = 'active',
          accepted_at = coalesce(m.accepted_at, now()),
          responded_at = now()
      where m.id = member.id
        and m.status is distinct from 'blocked'
      returning * into member;
    end if;

    return query select member.id, member.status, pin.id, wl.share_token, true;
    return;
  end if;

  if member.id is not null and member.status = 'active' and member.accepted_at is not null then
    return query select member.id, member.status, pin.id, wl.share_token, true;
    return;
  end if;

  if member.id is not null and member.status = 'blocked' then
    raise exception 'This person is not accepting requests from you';
  end if;

  if member.id is not null and member.status = 'pending_request'
     and member.created_at > now() - interval '30 days' then
    return query select member.id, member.status, pin.id, null::text, false;
    return;
  end if;

  if member.id is null then
    insert into public.wishlist_members (
      wishlist_id, user_id, role, status, requested_by, accepted_at
    ) values (
      wl.id, uid, 'viewer', 'pending_request', uid, null
    )
    returning * into member;
  else
    update public.wishlist_members m
    set status = 'pending_request',
        requested_by = uid,
        accepted_at = null,
        responded_at = null,
        created_at = now()
    where m.id = member.id
    returning * into member;
  end if;

  return query select member.id, member.status, pin.id, null::text, false;
end;
$$;

grant execute on function public.request_giver_access(uuid) to authenticated;
revoke all on function public.request_giver_access(uuid) from anon, public;

create or replace function public.respond_giver_access(p_member_id uuid, p_action text)
returns table (
  member_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member public.wishlist_members;
  action text := lower(trim(coalesce(p_action, '')));
begin
  if uid is null then
    raise exception 'Sign in';
  end if;
  if action not in ('accept', 'decline', 'block') then
    raise exception 'Unknown action';
  end if;

  select * into member
  from public.wishlist_members m
  where m.id = p_member_id;

  if member.id is null then
    raise exception 'Request not found';
  end if;
  if not public.is_wishlist_owner(member.wishlist_id) then
    raise exception 'Only the list owner can respond';
  end if;
  if member.status = 'pending_request' and member.created_at < now() - interval '30 days' then
    update public.wishlist_members
    set status = 'declined', responded_at = now()
    where id = member.id;
    raise exception 'That request expired';
  end if;

  if action = 'accept' then
    update public.wishlist_members m
    set status = 'active',
        accepted_at = coalesce(m.accepted_at, now()),
        responded_at = now()
    where m.id = member.id
    returning * into member;
  elsif action = 'decline' then
    update public.wishlist_members m
    set status = 'declined',
        accepted_at = null,
        responded_at = now()
    where m.id = member.id
    returning * into member;
  else
    update public.wishlist_members m
    set status = 'blocked',
        accepted_at = null,
        responded_at = now()
    where m.id = member.id
    returning * into member;

    insert into public.giver_blocks (owner_id, giver_id)
    values (uid, member.user_id)
    on conflict do nothing;
  end if;

  return query select member.id, member.status;
end;
$$;

grant execute on function public.respond_giver_access(uuid, text) to authenticated;
revoke all on function public.respond_giver_access(uuid, text) from anon, public;

create or replace function public.invite_giver_by_email(p_email text)
returns table (
  kind text,
  email text,
  member_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := lower(trim(coalesce(p_email, '')));
  found_id uuid;
  req record;
begin
  if uid is null then
    raise exception 'Sign in to invite by email';
  end if;
  if cleaned = '' or position('@' in cleaned) = 0 then
    raise exception 'Enter an email';
  end if;

  perform public.assert_giver_social_rate('email_invite', 10, interval '1 day');

  select u.id into found_id
  from auth.users u
  where lower(u.email) = cleaned
  limit 1;

  if found_id is not null then
    if found_id = uid then
      raise exception 'That is your own email';
    end if;
    select * into req from public.request_giver_access(found_id);
    return query select 'request'::text, cleaned, req.member_id, req.status;
    return;
  end if;

  insert into public.giver_email_invites (giver_id, email)
  select uid, cleaned
  where not exists (
    select 1
    from public.giver_email_invites e
    where e.giver_id = uid
      and lower(e.email) = cleaned
      and e.claimed_at is null
  );

  return query select 'stub'::text, cleaned, null::uuid, 'pending_invite'::text;
end;
$$;

grant execute on function public.invite_giver_by_email(text) to authenticated;
revoke all on function public.invite_giver_by_email(text) from anon, public;

-- Logged-in giver opens a share link → member row + pin (access already granted by token).
create or replace function public.claim_share_as_giver(p_token text)
returns table (
  member_id uuid,
  status text,
  pin_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  resolved record;
  wl public.wishlists;
  member public.wishlist_members;
  pin public.giver_people;
begin
  if uid is null then
    return;
  end if;

  select * into resolved from public.resolve_share_token(p_token);
  if resolved.wishlist_id is null then
    return;
  end if;

  select * into wl from public.wishlists w where w.id = resolved.wishlist_id;
  if wl.owner_id = uid then
    return;
  end if;

  if exists (
    select 1 from public.giver_blocks b
    where b.owner_id = wl.owner_id and b.giver_id = uid
  ) then
    return;
  end if;

  pin := public.pin_giver_person(wl.owner_id, wl.id, null);

  select * into member
  from public.wishlist_members m
  where m.wishlist_id = wl.id and m.user_id = uid;

  if member.id is null then
    insert into public.wishlist_members (
      wishlist_id, user_id, role, status, requested_by, accepted_at, responded_at
    ) values (
      wl.id, uid, 'viewer', 'active', uid, now(), now()
    )
    returning * into member;
  elsif member.status is distinct from 'blocked' then
    update public.wishlist_members m
    set status = 'active',
        accepted_at = coalesce(m.accepted_at, now()),
        responded_at = coalesce(m.responded_at, now())
    where m.id = member.id
    returning * into member;
  end if;

  return query select member.id, member.status, pin.id;
end;
$$;

grant execute on function public.claim_share_as_giver(text) to authenticated;
revoke all on function public.claim_share_as_giver(text) from anon, public;

create or replace function public.list_giver_people()
returns table (
  id uuid,
  recipient_id uuid,
  handle text,
  display_name text,
  label text,
  access_status text,
  can_open boolean,
  share_token text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in';
  end if;

  return query
  select
    gp.id,
    gp.recipient_id,
    p.handle,
    p.display_name,
    gp.label,
    coalesce(m.status, 'none')::text,
    (
      coalesce(m.status, '') = 'active'
      and m.accepted_at is not null
    ) or coalesce(w.is_public_link, false) as can_open,
    case
      when (
        (coalesce(m.status, '') = 'active' and m.accepted_at is not null)
        or coalesce(w.is_public_link, false)
      ) then coalesce(w.share_token, wl_pin.share_token)
      else null
    end as share_token,
    gp.created_at
  from public.giver_people gp
  join public.profiles p on p.id = gp.recipient_id
  left join public.wishlists wl_pin on wl_pin.id = gp.wishlist_id
  left join lateral (
    select wl.*
    from public.wishlists wl
    where wl.owner_id = gp.recipient_id
    order by wl.created_at asc
    limit 1
  ) w on true
  left join public.wishlist_members m
    on m.wishlist_id = coalesce(gp.wishlist_id, w.id)
   and m.user_id = uid
  where gp.giver_id = uid
  order by gp.created_at desc;
end;
$$;

grant execute on function public.list_giver_people() to authenticated;
revoke all on function public.list_giver_people() from anon, public;

create or replace function public.list_giver_access_requests()
returns table (
  member_id uuid,
  giver_id uuid,
  handle text,
  display_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in';
  end if;

  return query
  select
    m.id,
    m.user_id,
    p.handle,
    p.display_name,
    m.created_at
  from public.wishlist_members m
  join public.wishlists w on w.id = m.wishlist_id
  left join public.profiles p on p.id = m.user_id
  where w.owner_id = uid
    and m.status = 'pending_request'
    and m.requested_by is not null
    and m.created_at >= now() - interval '30 days'
  order by m.created_at desc;
end;
$$;

grant execute on function public.list_giver_access_requests() to authenticated;
revoke all on function public.list_giver_access_requests() from anon, public;

create or replace function public.unlist_giver_person(p_pin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in';
  end if;
  delete from public.giver_people
  where id = p_pin_id and giver_id = auth.uid();
end;
$$;

grant execute on function public.unlist_giver_person(uuid) to authenticated;
revoke all on function public.unlist_giver_person(uuid) from anon, public;
