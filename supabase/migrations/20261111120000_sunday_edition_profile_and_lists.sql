-- Sunday Edition: profile photos, list headlines, cover choice, occasion date.
-- Apply this on the hosted project before avatars and headlines sync across devices.
-- The app keeps a copy on the device until then, and falls back to initials.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Public wishlist-images URL. Null shows initials.';

alter table public.wishlists
  add column if not exists headline text,
  add column if not exists event_on date,
  add column if not exists cover_image_url text,
  add column if not exists cover_treatment text;

alter table public.wishlists
  drop constraint if exists wishlists_cover_treatment_check;

alter table public.wishlists
  add constraint wishlists_cover_treatment_check
  check (cover_treatment is null or cover_treatment in ('auto', 'full', 'print', 'monogram'));

comment on column public.wishlists.headline is
  'Optional serif headline chosen by the owner. Never written by a suggestion.';

alter table public.occasions
  add column if not exists headline text,
  add column if not exists event_on date,
  add column if not exists cover_image_url text,
  add column if not exists cover_treatment text;

alter table public.occasions
  drop constraint if exists occasions_cover_treatment_check;

alter table public.occasions
  add constraint occasions_cover_treatment_check
  check (cover_treatment is null or cover_treatment in ('auto', 'full', 'print', 'monogram'));

-- Avatars for the caller and people they already share a list with.
create or replace function public.profile_avatars(p_ids uuid[])
returns table (id uuid, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.avatar_url
  from public.profiles p
  where p.id = any (coalesce(p_ids, array[]::uuid[]))
    and (
      p.id = auth.uid()
      or exists (
        select 1
        from public.wishlist_members me
        join public.wishlist_members them on them.wishlist_id = me.wishlist_id
        where me.user_id = auth.uid()
          and them.user_id = p.id
          and me.status = 'active'
      )
      or exists (
        select 1
        from public.wishlists w
        join public.wishlist_members m on m.wishlist_id = w.id
        where w.owner_id = p.id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      or exists (
        select 1
        from public.giver_people gp
        where gp.giver_id = auth.uid()
          and gp.recipient_id = p.id
      )
    );
$$;

grant execute on function public.profile_avatars(uuid[]) to authenticated;
revoke all on function public.profile_avatars(uuid[]) from anon, public;
