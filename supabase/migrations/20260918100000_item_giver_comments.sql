-- Giver social B — item-only comments, invisible to the recipient/owner.
-- Logged-in active giver required to post. Token anon can still view/reserve
-- via existing share-token RPCs. Never grant owner SELECT (no count, no teaser).

create table if not exists public.item_giver_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.wishlist_items (id) on delete cascade,
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_display_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists item_giver_comments_item_idx
  on public.item_giver_comments (item_id, created_at);

comment on table public.item_giver_comments is
  'Giver-only thread on a wishlist item. Recipients have zero visibility — no rows, no count, no notifications.';

alter table public.item_giver_comments enable row level security;

-- Authenticated may touch rows only as an active giver (never the owner).
revoke all on public.item_giver_comments from public, anon;
grant select, insert, update, delete on public.item_giver_comments to authenticated;

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

-- Restrictive: owner JWT never matches, even if they somehow had a member row.
drop policy if exists item_giver_comments_deny_owner on public.item_giver_comments;
create policy item_giver_comments_deny_owner
  on public.item_giver_comments
  as restrictive
  for all
  to authenticated
  using (not public.is_wishlist_owner(wishlist_id))
  with check (not public.is_wishlist_owner(wishlist_id));

create or replace function public.assert_item_giver_comment_access(p_item_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to use giver notes';
  end if;

  select i.wishlist_id into wid
  from public.wishlist_items i
  where i.id = p_item_id;

  if wid is null then
    raise exception 'Gift not found';
  end if;
  if public.is_wishlist_owner(wid) then
    raise exception 'Not allowed';
  end if;
  if not public.is_active_giver(wid) then
    raise exception 'Not allowed';
  end if;
  return wid;
end;
$$;

revoke all on function public.assert_item_giver_comment_access(uuid) from public, anon, authenticated;

create or replace function public.list_item_giver_comments(p_item_id uuid)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz
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
    c.edited_at
  from public.item_giver_comments c
  where c.item_id = p_item_id
  order by c.created_at asc;
end;
$$;

grant execute on function public.list_item_giver_comments(uuid) to authenticated;
revoke all on function public.list_item_giver_comments(uuid) from anon, public;

create or replace function public.post_item_giver_comment(p_item_id uuid, p_body text)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz
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
begin
  wid := public.assert_item_giver_comment_access(p_item_id);
  if char_length(cleaned) < 1 or char_length(cleaned) > 2000 then
    raise exception 'Keep notes between 1 and 2000 characters';
  end if;

  select coalesce(nullif(trim(p.display_name), ''), nullif(p.handle, ''), 'A giver')
  into display
  from public.profiles p
  where p.id = uid;

  insert into public.item_giver_comments (
    item_id, wishlist_id, author_id, author_display_name, body
  ) values (
    p_item_id, wid, uid, coalesce(display, 'A giver'), cleaned
  )
  returning * into result;

  return query select
    result.id,
    result.item_id,
    result.author_id,
    result.author_display_name,
    result.body,
    result.created_at,
    result.edited_at;
end;
$$;

grant execute on function public.post_item_giver_comment(uuid, text) to authenticated;
revoke all on function public.post_item_giver_comment(uuid, text) from anon, public;

create or replace function public.edit_item_giver_comment(p_comment_id uuid, p_body text)
returns table (
  id uuid,
  item_id uuid,
  author_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  edited_at timestamptz
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
    raise exception 'Note not found';
  end if;
  perform public.assert_item_giver_comment_access(existing.item_id);
  if existing.author_id <> uid then
    raise exception 'You can only edit your own note';
  end if;
  if char_length(cleaned) < 1 or char_length(cleaned) > 2000 then
    raise exception 'Keep notes between 1 and 2000 characters';
  end if;

  update public.item_giver_comments c
  set body = cleaned, edited_at = now()
  where c.id = p_comment_id
  returning * into result;

  return query select
    result.id,
    result.item_id,
    result.author_id,
    result.author_display_name,
    result.body,
    result.created_at,
    result.edited_at;
end;
$$;

grant execute on function public.edit_item_giver_comment(uuid, text) to authenticated;
revoke all on function public.edit_item_giver_comment(uuid, text) from anon, public;

create or replace function public.delete_item_giver_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.item_giver_comments;
begin
  select * into existing from public.item_giver_comments c where c.id = p_comment_id;
  if existing.id is null then
    return;
  end if;
  perform public.assert_item_giver_comment_access(existing.item_id);
  if existing.author_id <> uid then
    raise exception 'You can only delete your own note';
  end if;
  delete from public.item_giver_comments where id = p_comment_id;
end;
$$;

grant execute on function public.delete_item_giver_comment(uuid) to authenticated;
revoke all on function public.delete_item_giver_comment(uuid) from anon, public;
