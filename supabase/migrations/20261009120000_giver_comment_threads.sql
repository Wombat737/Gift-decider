-- Giver comments: one-level replies, @tags, unread mentions.
-- Existing giver notes already live in item_giver_comments. This migration
-- keeps every one of those rows (no delete, no truncate, no body rewrite).
-- parent_id stays null, so each historical note becomes a root comment.
-- The list owner still has zero visibility: no rows, no counts, no mention pings.

alter table public.item_giver_comments
  add column if not exists parent_id uuid references public.item_giver_comments (id) on delete cascade;

comment on column public.item_giver_comments.parent_id is
  'Null for a root comment, including giver notes migrated from the flat thread. Set only for a one-level reply.';

create index if not exists item_giver_comments_parent_idx
  on public.item_giver_comments (parent_id)
  where parent_id is not null;

-- Every pre-existing giver note stays as a root comment. parent_id is null
-- until someone replies, so the row count of notes and roots must match.
do $$
declare
  note_count bigint;
  root_count bigint;
begin
  select count(*) into note_count from public.item_giver_comments;
  select count(*) into root_count from public.item_giver_comments where parent_id is null;
  if root_count <> note_count then
    raise exception 'Giver note migration lost rows (% notes, % roots)', note_count, root_count;
  end if;
end $$;

create table if not exists public.item_giver_comment_mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.item_giver_comments (id) on delete cascade,
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (comment_id, mentioned_user_id)
);

create index if not exists item_giver_comment_mentions_user_idx
  on public.item_giver_comment_mentions (mentioned_user_id, read_at);

create index if not exists item_giver_comment_mentions_comment_idx
  on public.item_giver_comment_mentions (comment_id);

comment on table public.item_giver_comment_mentions is
  'Giver @tags on a comment. The wishlist owner cannot read these rows.';

alter table public.item_giver_comment_mentions enable row level security;

revoke all on public.item_giver_comment_mentions from public, anon;
grant select, update (read_at) on public.item_giver_comment_mentions to authenticated;

-- Reaffirm comment policies so an owner JWT still cannot read the thread.
drop policy if exists item_giver_comments_select on public.item_giver_comments;
create policy item_giver_comments_select
  on public.item_giver_comments for select
  to authenticated
  using (public.is_active_giver(wishlist_id));

drop policy if exists item_giver_comments_insert on public.item_giver_comments;
create policy item_giver_comments_insert
  on public.item_giver_comments for insert
  to authenticated
  with check (
    public.is_active_giver(wishlist_id)
    and author_id = auth.uid()
  );

drop policy if exists item_giver_comments_update on public.item_giver_comments;
create policy item_giver_comments_update
  on public.item_giver_comments for update
  to authenticated
  using (author_id = auth.uid() and public.is_active_giver(wishlist_id))
  with check (author_id = auth.uid() and public.is_active_giver(wishlist_id));

drop policy if exists item_giver_comments_delete on public.item_giver_comments;
create policy item_giver_comments_delete
  on public.item_giver_comments for delete
  to authenticated
  using (author_id = auth.uid() and public.is_active_giver(wishlist_id));

drop policy if exists item_giver_comments_deny_owner on public.item_giver_comments;
create policy item_giver_comments_deny_owner
  on public.item_giver_comments
  as restrictive
  for all
  to authenticated
  using (not public.is_wishlist_owner(wishlist_id))
  with check (not public.is_wishlist_owner(wishlist_id));

drop policy if exists item_giver_comment_mentions_select on public.item_giver_comment_mentions;
create policy item_giver_comment_mentions_select
  on public.item_giver_comment_mentions for select
  to authenticated
  using (
    public.is_active_giver(wishlist_id)
    and mentioned_user_id = auth.uid()
  );

drop policy if exists item_giver_comment_mentions_update on public.item_giver_comment_mentions;
create policy item_giver_comment_mentions_update
  on public.item_giver_comment_mentions for update
  to authenticated
  using (
    public.is_active_giver(wishlist_id)
    and mentioned_user_id = auth.uid()
  )
  with check (
    public.is_active_giver(wishlist_id)
    and mentioned_user_id = auth.uid()
  );

drop policy if exists item_giver_comment_mentions_deny_owner on public.item_giver_comment_mentions;
create policy item_giver_comment_mentions_deny_owner
  on public.item_giver_comment_mentions
  as restrictive
  for all
  to authenticated
  using (not public.is_wishlist_owner(wishlist_id))
  with check (not public.is_wishlist_owner(wishlist_id));

create or replace function public.enforce_giver_comment_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.item_giver_comments;
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Replies are one level deep';
  end if;

  select * into parent from public.item_giver_comments where id = new.parent_id;
  if parent.id is null then
    raise exception 'Reply target not found';
  end if;
  if parent.parent_id is not null then
    raise exception 'Replies are one level deep';
  end if;
  if parent.item_id <> new.item_id or parent.wishlist_id <> new.wishlist_id then
    raise exception 'Reply must stay on the same gift';
  end if;
  return new;
end;
$$;

drop trigger if exists item_giver_comments_thread on public.item_giver_comments;
create trigger item_giver_comments_thread
  before insert or update of parent_id, item_id, wishlist_id
  on public.item_giver_comments
  for each row execute function public.enforce_giver_comment_thread();

revoke all on function public.enforce_giver_comment_thread() from public, anon, authenticated;

create or replace function public.extract_giver_mention_handles(p_body text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(distinct lower(hit[1]))
      from regexp_matches(
        coalesce(p_body, ''),
        '(?:^|[^[:alnum:]_])@([a-zA-Z0-9_]{3,30})',
        'g'
      ) as hit
    ),
    '{}'::text[]
  );
$$;

revoke all on function public.extract_giver_mention_handles(text) from public, anon, authenticated;

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
  handles text[];
  wanted uuid[];
begin
  select * into existing from public.item_giver_comments where id = p_comment_id;
  if existing.id is null then
    return;
  end if;

  handles := public.extract_giver_mention_handles(existing.body);

  select coalesce(array_agg(distinct p.id), '{}'::uuid[])
  into wanted
  from public.profiles p
  join public.wishlist_members m
    on m.user_id = p.id
   and m.wishlist_id = existing.wishlist_id
  where m.status = 'active'
    and m.accepted_at is not null
    and p.id <> existing.author_id
    and p.id <> (select w.owner_id from public.wishlists w where w.id = existing.wishlist_id)
    and (
      p.id = any(coalesce(p_mention_ids, '{}'::uuid[]))
      or (p.handle is not null and lower(p.handle) = any(handles))
    );

  delete from public.item_giver_comment_mentions mn
  where mn.comment_id = existing.id
    and not (mn.mentioned_user_id = any(wanted));

  insert into public.item_giver_comment_mentions (comment_id, wishlist_id, mentioned_user_id)
  select existing.id, existing.wishlist_id, uid
  from unnest(wanted) as uid
  on conflict (comment_id, mentioned_user_id) do nothing;
end;
$$;

revoke all on function public.sync_item_giver_comment_mentions(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.giver_comment_mentions_json(p_comment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'handle', p.handle,
        'display_name', p.display_name
      )
      order by p.display_name nulls last, p.handle nulls last
    ),
    '[]'::jsonb
  )
  from public.item_giver_comment_mentions mn
  join public.profiles p on p.id = mn.mentioned_user_id
  where mn.comment_id = p_comment_id;
$$;

revoke all on function public.giver_comment_mentions_json(uuid) from public, anon, authenticated;

create or replace function public.giver_comment_unread_for_me(p_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.item_giver_comment_mentions mn
    where mn.comment_id = p_comment_id
      and mn.mentioned_user_id = auth.uid()
      and mn.read_at is null
  );
$$;

revoke all on function public.giver_comment_unread_for_me(uuid) from public, anon, authenticated;

drop function if exists public.list_item_giver_comments(uuid);

create function public.list_item_giver_comments(p_item_id uuid)
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
  order by c.created_at asc;
end;
$$;

grant execute on function public.list_item_giver_comments(uuid) to authenticated;
revoke all on function public.list_item_giver_comments(uuid) from anon, public;

drop function if exists public.post_item_giver_comment(uuid, text);

create function public.post_item_giver_comment(
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

  if p_parent_id is not null then
    select * into parent from public.item_giver_comments where id = p_parent_id;
    if parent.id is null or parent.item_id <> p_item_id then
      raise exception 'Reply target not found';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies are one level deep';
    end if;
  end if;

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

drop function if exists public.edit_item_giver_comment(uuid, text);

create function public.edit_item_giver_comment(
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
declare
  uid uuid := auth.uid();
  existing public.item_giver_comments;
  cleaned text := trim(coalesce(p_body, ''));
  result public.item_giver_comments;
begin
  select * into existing from public.item_giver_comments c where c.id = p_comment_id;
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
  order by coalesce(p.display_name, p.handle);
end;
$$;

comment on function public.list_comment_tag_candidates(uuid) is
  'Active givers on this list for @tag autocomplete. Excludes the list owner. No emails.';

grant execute on function public.list_comment_tag_candidates(uuid) to authenticated;
revoke all on function public.list_comment_tag_candidates(uuid) from anon, public;

create or replace function public.mark_item_giver_comment_mentions_read(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
begin
  wid := public.assert_item_giver_comment_access(p_item_id);

  update public.item_giver_comment_mentions mn
  set read_at = now()
  where mn.wishlist_id = wid
    and mn.mentioned_user_id = auth.uid()
    and mn.read_at is null
    and mn.comment_id in (
      select c.id from public.item_giver_comments c where c.item_id = p_item_id
    );
end;
$$;

grant execute on function public.mark_item_giver_comment_mentions_read(uuid) to authenticated;
revoke all on function public.mark_item_giver_comment_mentions_read(uuid) from anon, public;
