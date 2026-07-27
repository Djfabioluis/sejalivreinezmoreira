
drop policy if exists "wa-audio service write" on storage.objects;
create policy "wa-audio service write"
  on storage.objects for all
  to service_role
  using (bucket_id = 'wa-audio')
  with check (bucket_id = 'wa-audio');
