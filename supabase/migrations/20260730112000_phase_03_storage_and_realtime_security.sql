insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'bluebooth-media',
  'bluebooth-media',
  false,
  20971520,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function public.storage_room_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^rooms/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/sessions/'
      then split_part(p_name, '/', 2)::uuid
    else null
  end;
$$;

create function public.storage_session_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^rooms/[0-9a-fA-F-]{36}/sessions/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
      then split_part(p_name, '/', 4)::uuid
    else null
  end;
$$;

create function public.realtime_room_id(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^room:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then split_part(p_topic, ':', 2)::uuid
    else null
  end;
$$;

create policy bluebooth_media_select_members
on storage.objects for select to authenticated
using (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
);

create policy bluebooth_media_insert_scoped
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and exists (
    select 1
    from public.photobooth_sessions session
    where session.id = public.storage_session_id(name)
      and session.room_id = public.storage_room_id(name)
  )
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and split_part(name, '/', 6) = auth.uid()::text
    )
    or (
      split_part(name, '/', 5) = 'result'
      and split_part(name, '/', 6) = 'final.png'
      and public.is_room_host(public.storage_room_id(name))
    )
  )
);

create policy bluebooth_media_update_scoped
on storage.objects for update to authenticated
using (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and split_part(name, '/', 6) = auth.uid()::text
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.is_room_host(public.storage_room_id(name))
    )
  )
)
with check (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and split_part(name, '/', 6) = auth.uid()::text
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.is_room_host(public.storage_room_id(name))
    )
  )
);

create policy bluebooth_media_delete_scoped
on storage.objects for delete to authenticated
using (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and split_part(name, '/', 6) = auth.uid()::text
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.is_room_host(public.storage_room_id(name))
    )
  )
);

create policy bluebooth_private_topics_select
on realtime.messages for select to authenticated
using (
  public.is_active_room_member(public.realtime_room_id(realtime.topic()))
);

create policy bluebooth_private_topics_insert
on realtime.messages for insert to authenticated
with check (
  public.is_active_room_member(public.realtime_room_id(realtime.topic()))
);

revoke all on function public.storage_room_id(text) from public, anon;
revoke all on function public.storage_session_id(text) from public, anon;
revoke all on function public.realtime_room_id(text) from public, anon;
grant execute on function public.storage_room_id(text) to authenticated;
grant execute on function public.storage_session_id(text) to authenticated;
grant execute on function public.realtime_room_id(text) to authenticated;
