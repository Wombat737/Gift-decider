-- Guideline 1.2 for giver comments: report, giver-to-giver block, language filter, terms.
-- Apply after 20261009120000_giver_comment_threads.sql.
-- Nothing here emails, webhooks, or otherwise sends a report off the database.
-- The wishlist owner still cannot read comments, mentions, or reports.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.terms_accepted_at is
  'When this person agreed to the Terms of Use. Required before posting or editing a giver comment.';

create or replace function public.keep_terms_accepted_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.terms_accepted_at is not null then
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_keep_terms_accepted_at on public.profiles;
create trigger profiles_keep_terms_accepted_at
  before update of terms_accepted_at on public.profiles
  for each row execute function public.keep_terms_accepted_at();

revoke all on function public.keep_terms_accepted_at() from public, anon, authenticated;

create or replace function public.accept_terms()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  accepted timestamptz;
begin
  if uid is null then
    raise exception 'Sign in to agree to the Terms';
  end if;

  update public.profiles p
  set terms_accepted_at = coalesce(p.terms_accepted_at, now())
  where p.id = uid
  returning p.terms_accepted_at into accepted;

  if accepted is null then
    raise exception 'Profile not found';
  end if;
  return accepted;
end;
$$;

grant execute on function public.accept_terms() to authenticated;
revoke all on function public.accept_terms() from anon, public;

create or replace function public.assert_terms_accepted()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.terms_accepted_at is not null
  ) then
    raise exception 'Agree to the Terms before commenting.';
  end if;
end;
$$;

revoke all on function public.assert_terms_accepted() from public, anon, authenticated;

-- Whole-word filter. Keep this list in sync with src/lib/comment-safety.ts.
create or replace function public.comment_body_is_objectionable(p_body text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  raw text := lower(coalesce(p_body, ''));
  spaced text;
  squeezed text;
  previous text;
  token text;
  letters text := '';
  banned text[] := array[
    'fuck',
    'fucking',
    'fucked',
    'fucker',
    'motherfucker',
    'shit',
    'shitty',
    'bullshit',
    'bitch',
    'bitches',
    'asshole',
    'arsehole',
    'bastard',
    'dick',
    'dickhead',
    'cock',
    'pussy',
    'cunt',
    'whore',
    'slut',
    'nigger',
    'nigga',
    'faggot',
    'fag',
    'retard',
    'retarded',
    'tranny',
    'kike',
    'spic',
    'chink',
    'fck',
    'fuk',
    'fuq',
    'fock'
  ];
  tokens text[] := array[]::text[];
begin
  raw := translate(raw, '@01345$', 'aoieass');
  spaced := trim(both from regexp_replace(regexp_replace(raw, '[^a-z]+', ' ', 'g'), '\s+', ' ', 'g'));

  squeezed := raw;
  previous := '';
  while squeezed is distinct from previous loop
    previous := squeezed;
    squeezed := regexp_replace(squeezed, '([a-z])[^a-z]([a-z])', '\1\2', 'g');
  end loop;
  squeezed := trim(both from regexp_replace(regexp_replace(squeezed, '[^a-z]+', ' ', 'g'), '\s+', ' ', 'g'));

  if spaced <> '' then
    tokens := tokens || regexp_split_to_array(spaced, ' ');
  end if;
  if squeezed <> '' then
    tokens := tokens || regexp_split_to_array(squeezed, ' ');
  end if;

  foreach token in array tokens loop
    if token is null or token = '' then
      continue;
    end if;
    if token = any(banned)
      or regexp_replace(token, '(.)\1+', '\1', 'g') = any(banned) then
      return true;
    end if;
  end loop;

  if spaced <> '' then
    foreach token in array regexp_split_to_array(spaced, ' ') loop
      if token is null or token = '' then
        continue;
      end if;
      if char_length(token) = 1 then
        letters := letters || token;
      else
        if char_length(letters) >= 3
          and (
            letters = any(banned)
            or regexp_replace(letters, '(.)\1+', '\1', 'g') = any(banned)
          ) then
          return true;
        end if;
        letters := '';
      end if;
    end loop;
  end if;

  if char_length(letters) >= 3
    and (
      letters = any(banned)
      or regexp_replace(letters, '(.)\1+', '\1', 'g') = any(banned)
    ) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.comment_body_is_objectionable(text) from public, anon, authenticated;

-- Giver-to-giver blocks. Distinct from giver_blocks (a recipient blocking a requester).
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id, blocker_id);

comment on table public.user_blocks is
  'A giver hid another giver. Only the blocker can read or remove the row. No comment text is stored.';

alter table public.user_blocks enable row level security;

revoke all on public.user_blocks from public, anon;
grant select, insert, delete on public.user_blocks to authenticated;

drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

create or replace function public.list_blocked_users()
returns table (
  id uuid,
  handle text,
  display_name text,
  blocked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'Sign in to see blocked people';
  end if;

  return query
  select p.id, p.handle, p.display_name, ub.created_at
  from public.user_blocks ub
  join public.profiles p on p.id = ub.blocked_id
  where ub.blocker_id = auth.uid()
  order by ub.created_at desc;
end;
$$;

grant execute on function public.list_blocked_users() to authenticated;
revoke all on function public.list_blocked_users() from anon, public;

create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in to block someone';
  end if;
  if p_user_id is null or p_user_id = uid then
    raise exception 'You can''t block yourself.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Person not found';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (uid, p_user_id)
  on conflict (blocker_id, blocked_id) do nothing;
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
revoke all on function public.block_user(uuid) from anon, public;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to unblock someone';
  end if;

  delete from public.user_blocks ub
  where ub.blocker_id = auth.uid()
    and ub.blocked_id = p_user_id;
end;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;
revoke all on function public.unblock_user(uuid) from anon, public;

-- Reports of giver comments. The row stores the reason, not the comment body.
-- Review in the SQL editor (the table owner bypasses RLS), for example:
--   select r.created_at, r.reason, r.details, r.status, c.body, c.author_id
--   from public.item_giver_comment_reports r
--   join public.item_giver_comments c on c.id = r.comment_id
--   where r.status = 'open'
--   order by r.created_at;
create table if not exists public.item_giver_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.item_giver_comments (id) on delete cascade,
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint item_giver_comment_reports_reason_chk check (
    reason in ('harassment', 'hate', 'sexual', 'spam', 'other')
  ),
  constraint item_giver_comment_reports_details_chk check (
    details is null or char_length(details) between 1 and 500
  ),
  constraint item_giver_comment_reports_status_chk check (
    status in ('open', 'reviewed', 'removed')
  ),
  constraint item_giver_comment_reports_once unique (comment_id, reporter_id)
);

create index if not exists item_giver_comment_reports_open_idx
  on public.item_giver_comment_reports (created_at)
  where status = 'open';

create index if not exists item_giver_comment_reports_reporter_idx
  on public.item_giver_comment_reports (reporter_id, comment_id);

comment on table public.item_giver_comment_reports is
  'Giver reports of giver comments. Reporters read only their own rows. The wishlist owner is denied. Admins review via SQL. Nothing is sent externally.';

alter table public.item_giver_comment_reports enable row level security;

revoke all on public.item_giver_comment_reports from public, anon;
grant select, insert on public.item_giver_comment_reports to authenticated;

drop policy if exists item_giver_comment_reports_select on public.item_giver_comment_reports;
create policy item_giver_comment_reports_select
  on public.item_giver_comment_reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    and public.is_active_giver(wishlist_id)
  );

drop policy if exists item_giver_comment_reports_insert on public.item_giver_comment_reports;
create policy item_giver_comment_reports_insert
  on public.item_giver_comment_reports for insert
  to authenticated
  with check (
    item_giver_comment_reports.reporter_id = auth.uid()
    and public.is_active_giver(item_giver_comment_reports.wishlist_id)
    and exists (
      select 1
      from public.item_giver_comments c
      where c.id = item_giver_comment_reports.comment_id
        and c.wishlist_id = item_giver_comment_reports.wishlist_id
        and c.author_id <> auth.uid()
    )
  );

drop policy if exists item_giver_comment_reports_deny_owner on public.item_giver_comment_reports;
create policy item_giver_comment_reports_deny_owner
  on public.item_giver_comment_reports
  as restrictive
  for all
  to authenticated
  using (not public.is_wishlist_owner(wishlist_id))
  with check (not public.is_wishlist_owner(wishlist_id));

create or replace function public.report_item_giver_comment(
  p_comment_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.item_giver_comments;
  cleaned_reason text := lower(trim(coalesce(p_reason, '')));
  cleaned_details text := nullif(trim(coalesce(p_details, '')), '');
  report_id uuid;
begin
  if uid is null then
    raise exception 'Sign in to report a comment';
  end if;

  select * into existing
  from public.item_giver_comments c
  where c.id = p_comment_id;

  if existing.id is null then
    raise exception 'Comment not found';
  end if;

  perform public.assert_item_giver_comment_access(existing.item_id);

  if existing.author_id = uid then
    raise exception 'You can only report someone else''s comment.';
  end if;
  if cleaned_reason not in ('harassment', 'hate', 'sexual', 'spam', 'other') then
    raise exception 'Choose a report reason';
  end if;
  if cleaned_details is not null and char_length(cleaned_details) > 500 then
    raise exception 'Keep the report note under 500 characters';
  end if;

  insert into public.item_giver_comment_reports (
    comment_id, wishlist_id, reporter_id, reason, details
  ) values (
    existing.id, existing.wishlist_id, uid, cleaned_reason, cleaned_details
  )
  on conflict (comment_id, reporter_id) do nothing
  returning id into report_id;

  if report_id is null then
    select r.id into report_id
    from public.item_giver_comment_reports r
    where r.comment_id = existing.id
      and r.reporter_id = uid;
  end if;

  return report_id;
end;
$$;

grant execute on function public.report_item_giver_comment(uuid, text, text) to authenticated;
revoke all on function public.report_item_giver_comment(uuid, text, text) from anon, public;

create or replace function public.giver_comment_mention_ids(
  p_wishlist_id uuid,
  p_author_id uuid,
  p_body text,
  p_mention_ids uuid[]
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  handles text[];
  wanted uuid[];
begin
  handles := public.extract_giver_mention_handles(p_body);

  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
  into wanted
  from public.profiles p
  join public.wishlist_members m
    on m.user_id = p.id
   and m.wishlist_id = p_wishlist_id
  where m.status = 'active'
    and m.accepted_at is not null
    and p.id <> p_author_id
    and p.id <> (select w.owner_id from public.wishlists w where w.id = p_wishlist_id)
    and (
      p.id = any(coalesce(p_mention_ids, '{}'::uuid[]))
      or (p.handle is not null and lower(p.handle) = any(handles))
    );

  return coalesce(wanted, '{}'::uuid[]);
end;
$$;

revoke all on function public.giver_comment_mention_ids(uuid, uuid, text, uuid[]) from public, anon, authenticated;

create or replace function public.assert_giver_comment_mentions_allowed(
  p_wishlist_id uuid,
  p_author_id uuid,
  p_body text,
  p_mention_ids uuid[]
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wanted uuid[];
begin
  wanted := public.giver_comment_mention_ids(p_wishlist_id, p_author_id, p_body, p_mention_ids);
  if exists (
    select 1
    from unnest(coalesce(wanted, '{}'::uuid[])) as blocked_target(target_id)
    join public.user_blocks ub
      on (ub.blocker_id = p_author_id and ub.blocked_id = blocked_target.target_id)
      or (ub.blocker_id = blocked_target.target_id and ub.blocked_id = p_author_id)
  ) then
    raise exception 'You can''t mention that person.';
  end if;
end;
$$;

revoke all on function public.assert_giver_comment_mentions_allowed(uuid, uuid, text, uuid[]) from public, anon, authenticated;

create or replace function public.sync_item_giver_comment_mentions(
  p_comment_id uuid,
  p_mention_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.item_giver_comments;
  wanted uuid[];
  filtered uuid[];
begin
  select * into existing
  from public.item_giver_comments c
  where c.id = p_comment_id;
  if existing.id is null then
    return;
  end if;

  wanted := public.giver_comment_mention_ids(
    existing.wishlist_id,
    existing.author_id,
    existing.body,
    p_mention_ids
  );

  select coalesce(array_agg(blocked_target.target_id), '{}'::uuid[])
  into filtered
  from unnest(coalesce(wanted, '{}'::uuid[])) as blocked_target(target_id)
  where not exists (
    select 1
    from public.user_blocks ub
    where (ub.blocker_id = existing.author_id and ub.blocked_id = blocked_target.target_id)
       or (ub.blocker_id = blocked_target.target_id and ub.blocked_id = existing.author_id)
  );

  delete from public.item_giver_comment_mentions mn
  where mn.comment_id = existing.id
    and not (mn.mentioned_user_id = any(filtered));

  insert into public.item_giver_comment_mentions (comment_id, wishlist_id, mentioned_user_id)
  select existing.id, existing.wishlist_id, mentioned.uid
  from unnest(filtered) as mentioned(uid)
  on conflict (comment_id, mentioned_user_id) do nothing;
end;
$$;

revoke all on function public.sync_item_giver_comment_mentions(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.list_item_giver_comments(p_item_id uuid)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  parent_id uuid,
  mentions jsonb,
  unread boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform public.assert_item_giver_comment_access(p_item_id);

  return query
  select
    c.id,
    c.item_id,
    c.author_id,
    c.author_display_name,
    c.body,
    c.created_at,
    c.edited_at,
    c.parent_id,
    public.giver_comment_mentions_json(c.id),
    public.giver_comment_unread_for_me(c.id)
  from public.item_giver_comments c
  where c.item_id = p_item_id
    and not exists (
      select 1
      from public.user_blocks ub
      where ub.blocker_id = auth.uid()
        and ub.blocked_id = c.author_id
    )
    and not exists (
      select 1
      from public.item_giver_comment_reports r
      where r.reporter_id = auth.uid()
        and r.comment_id = c.id
    )
  order by c.created_at asc;
end;
$$;

grant execute on function public.list_item_giver_comments(uuid) to authenticated;
revoke all on function public.list_item_giver_comments(uuid) from anon, public;

create or replace function public.post_item_giver_comment(
  p_item_id uuid,
  p_body text,
  p_parent_id uuid default null,
  p_mention_ids uuid[] default '{}'
)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  parent_id uuid,
  mentions jsonb,
  unread boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  wid uuid;
  cleaned text := trim(coalesce(p_body, ''));
  display text;
  result public.item_giver_comments;
  parent public.item_giver_comments;
begin
  wid := public.assert_item_giver_comment_access(p_item_id);
  if char_length(cleaned) < 1 or char_length(cleaned) > 2000 then
    raise exception 'Keep comments between 1 and 2000 characters';
  end if;
  if public.comment_body_is_objectionable(cleaned) then
    raise exception 'Please rephrase that. We don''t allow abusive language.';
  end if;
  perform public.assert_terms_accepted();

  if p_parent_id is not null then
    -- Alias pc: RETURNS TABLE publishes an output column named id, so a bare
    -- `id` is ambiguous. Keep `pc.id`.
    select * into parent
    from public.item_giver_comments pc
    where pc.id = p_parent_id;
    if parent.id is null or parent.item_id <> p_item_id then
      raise exception 'Reply target not found';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies are one level deep';
    end if;
  end if;

  perform public.assert_giver_comment_mentions_allowed(wid, uid, cleaned, p_mention_ids);

  select coalesce(nullif(trim(p.display_name), ''), nullif(p.handle, ''), 'A giver')
  into display
  from public.profiles p
  where p.id = uid;

  insert into public.item_giver_comments (
    item_id, wishlist_id, author_id, author_display_name, body, parent_id
  ) values (
    p_item_id, wid, uid, coalesce(display, 'A giver'), cleaned, p_parent_id
  )
  returning * into result;

  perform public.sync_item_giver_comment_mentions(result.id, coalesce(p_mention_ids, '{}'::uuid[]));

  return query select
    result.id,
    result.item_id,
    result.author_id,
    result.author_display_name,
    result.body,
    result.created_at,
    result.edited_at,
    result.parent_id,
    public.giver_comment_mentions_json(result.id),
    public.giver_comment_unread_for_me(result.id);
end;
$$;

grant execute on function public.post_item_giver_comment(uuid, text, uuid, uuid[]) to authenticated;
revoke all on function public.post_item_giver_comment(uuid, text, uuid, uuid[]) from anon, public;

create or replace function public.edit_item_giver_comment(
  p_comment_id uuid,
  p_body text,
  p_mention_ids uuid[] default '{}'
)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  parent_id uuid,
  mentions jsonb,
  unread boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  existing public.item_giver_comments;
  cleaned text := trim(coalesce(p_body, ''));
  result public.item_giver_comments;
begin
  select * into existing
  from public.item_giver_comments c
  where c.id = p_comment_id;
  if existing.id is null then
    raise exception 'Comment not found';
  end if;
  perform public.assert_item_giver_comment_access(existing.item_id);
  if existing.author_id <> uid then
    raise exception 'You can only edit your own comment';
  end if;
  if char_length(cleaned) < 1 or char_length(cleaned) > 2000 then
    raise exception 'Keep comments between 1 and 2000 characters';
  end if;
  if public.comment_body_is_objectionable(cleaned) then
    raise exception 'Please rephrase that. We don''t allow abusive language.';
  end if;
  perform public.assert_terms_accepted();
  perform public.assert_giver_comment_mentions_allowed(
    existing.wishlist_id,
    uid,
    cleaned,
    p_mention_ids
  );

  update public.item_giver_comments c
  set body = cleaned, edited_at = now()
  where c.id = p_comment_id
  returning * into result;

  perform public.sync_item_giver_comment_mentions(result.id, coalesce(p_mention_ids, '{}'::uuid[]));

  return query select
    result.id,
    result.item_id,
    result.author_id,
    result.author_display_name,
    result.body,
    result.created_at,
    result.edited_at,
    result.parent_id,
    public.giver_comment_mentions_json(result.id),
    public.giver_comment_unread_for_me(result.id);
end;
$$;

grant execute on function public.edit_item_giver_comment(uuid, text, uuid[]) to authenticated;
revoke all on function public.edit_item_giver_comment(uuid, text, uuid[]) from anon, public;

create or replace function public.list_comment_tag_candidates(p_item_id uuid)
returns table (
  id uuid,
  handle text,
  display_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  wid uuid;
  owner uuid;
begin
  wid := public.assert_item_giver_comment_access(p_item_id);
  select w.owner_id into owner from public.wishlists w where w.id = wid;

  return query
  select p.id, p.handle, p.display_name
  from public.wishlist_members m
  join public.profiles p on p.id = m.user_id
  where m.wishlist_id = wid
    and m.status = 'active'
    and m.accepted_at is not null
    and m.user_id is not null
    and p.id <> auth.uid()
    and p.id is distinct from owner
    and not public.is_wishlist_owner(wid)
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = p.id)
         or (ub.blocker_id = p.id and ub.blocked_id = auth.uid())
    )
  order by coalesce(p.display_name, p.handle);
end;
$$;

comment on function public.list_comment_tag_candidates(uuid) is
  'Active givers on this list for @tag autocomplete. Excludes the list owner and anyone in a block with the caller. No emails.';

grant execute on function public.list_comment_tag_candidates(uuid) to authenticated;
revoke all on function public.list_comment_tag_candidates(uuid) from anon, public;
