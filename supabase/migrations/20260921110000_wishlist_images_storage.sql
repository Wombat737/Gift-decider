-- Idempotent wishlist photo bucket. Init already created this; re-assert for
-- hosted projects that skipped Storage, and cap mime / size for uploads.
-- App path: {auth.uid()}/{uuid}.jpg → public URL on wishlist_items.image_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wishlist-images',
  'wishlist-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists wishlist_images_public_read on storage.objects;
create policy wishlist_images_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'wishlist-images');

drop policy if exists wishlist_images_owner_insert on storage.objects;
create policy wishlist_images_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists wishlist_images_owner_update on storage.objects;
create policy wishlist_images_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists wishlist_images_owner_delete on storage.objects;
create policy wishlist_images_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wishlist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
