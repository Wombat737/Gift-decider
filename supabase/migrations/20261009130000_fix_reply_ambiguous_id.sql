-- Reply insert: qualify item_giver_comments.id.
-- post_item_giver_comment returns a column named id, so an unqualified
-- `where id = p_parent_id` is ambiguous. Already applied on the live project.
-- Grants match 20261009120000_giver_comment_threads.sql.

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
    select * into parent from public.item_giver_comments pc where pc.id = p_parent_id;
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
