alter table public.photobooth_sessions
  drop constraint photobooth_sessions_status_check;

alter table public.photobooth_sessions
  add constraint photobooth_sessions_status_check
  check (
    status in (
      'preparing',
      'waiting-for-ready',
      'countdown',
      'capturing',
      'waiting-for-uploads',
      'review',
      'retake-countdown',
      'completed',
      'cancelled'
    )
  );

alter table public.photobooth_sessions
  add column retake_shot_index integer,
  add column full_retake boolean not null default false,
  add constraint photobooth_sessions_retake_index_valid
    check (retake_shot_index is null or retake_shot_index between 0 and 63);

alter table public.rooms
  add column active_session_id uuid,
  add constraint rooms_active_session_fk
    foreign key (active_session_id)
    references public.photobooth_sessions(id)
    on delete set null;

alter table public.captures
  add column revision bigint not null default 0 check (revision >= 0),
  add column captured_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 8192
    ),
  add column updated_at timestamptz not null default now();

create trigger captures_set_updated_at
before update on public.captures
for each row execute function public.set_updated_at();

create table public.capture_session_readiness (
  session_id uuid not null,
  room_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null check (revision >= 0),
  camera_ready boolean not null,
  acknowledged_at timestamptz not null default now(),
  primary key (session_id, user_id),
  constraint capture_readiness_session_room_fk
    foreign key (session_id, room_id)
    references public.photobooth_sessions(id, room_id)
    on delete cascade
);

alter table public.capture_session_readiness enable row level security;

create policy capture_readiness_select_members
on public.capture_session_readiness for select to authenticated
using (public.is_active_room_member(room_id));

revoke all on public.capture_session_readiness from public, anon, authenticated;
grant select on public.capture_session_readiness to authenticated;

create function public.create_capture_session(
  p_room_id uuid,
  p_configuration jsonb,
  p_shot_count integer
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_room public.rooms;
  created_session public.photobooth_sessions;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.is_room_host(p_room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if p_configuration is null
    or jsonb_typeof(p_configuration) <> 'object'
    or octet_length(p_configuration::text) > 65536 then
    raise exception using errcode = '22023', message = 'invalid_configuration';
  end if;
  if p_shot_count is null or p_shot_count not between 1 and 64 then
    raise exception using errcode = '22023', message = 'invalid_shot_count';
  end if;

  select *
  into target_room
  from public.rooms
  where id = p_room_id
  for update;

  if target_room.id is null or target_room.status not in ('setup', 'review') then
    raise exception using errcode = '55000', message = 'room_not_ready';
  end if;
  if (
    select count(*)
    from public.room_members member
    where member.room_id = p_room_id and member.left_at is null
  ) <> 2 then
    raise exception using errcode = '55000', message = 'both_members_required';
  end if;

  if target_room.active_session_id is not null then
    update public.photobooth_sessions
    set status = 'cancelled',
        revision = revision + 1
    where id = target_room.active_session_id
      and status not in ('completed', 'cancelled');
  end if;

  insert into public.photobooth_sessions (
    room_id,
    created_by,
    status,
    configuration,
    shot_count
  )
  values (
    p_room_id,
    caller_id,
    'waiting-for-ready',
    p_configuration,
    p_shot_count
  )
  returning * into created_session;

  update public.rooms
  set active_session_id = created_session.id,
      status = 'capturing'
  where id = p_room_id;

  return created_session;
end;
$$;

create function public.get_capture_server_time(p_room_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_room_member(p_room_id) then
    raise exception using errcode = '42501', message = 'membership_required';
  end if;
  return clock_timestamp();
end;
$$;

create function public.attach_capture_custom_frame(
  p_session_id uuid,
  p_expected_revision bigint,
  p_storage_path text
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.photobooth_sessions;
  expected_prefix text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.status <> 'waiting-for-ready'
    or target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;

  expected_prefix := format(
    'rooms/%s/sessions/%s/frames/%s/',
    target_session.room_id,
    target_session.id,
    auth.uid()
  );
  if p_storage_path !~ ('^' || expected_prefix || '[0-9a-fA-F-]{36}\.(png|webp)$')
    or not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'bluebooth-media'
        and object.name = p_storage_path
    ) then
    raise exception using errcode = '55000', message = 'custom_frame_object_missing';
  end if;

  update public.photobooth_sessions
  set configuration = jsonb_set(
    configuration,
    '{customFrameStoragePath}',
    to_jsonb(p_storage_path),
    true
  )
  where id = target_session.id
  returning * into target_session;

  return target_session;
end;
$$;

create function public.acknowledge_capture_ready(
  p_session_id uuid,
  p_expected_revision bigint,
  p_camera_ready boolean
)
returns public.capture_session_readiness
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_session public.photobooth_sessions;
  acknowledgement public.capture_session_readiness;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id;

  if target_session.id is null
    or not public.is_active_room_member(target_session.room_id) then
    raise exception using errcode = '42501', message = 'membership_required';
  end if;
  if target_session.status <> 'waiting-for-ready' then
    raise exception using errcode = '55000', message = 'session_not_waiting_for_ready';
  end if;
  if target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;

  insert into public.capture_session_readiness (
    session_id,
    room_id,
    user_id,
    revision,
    camera_ready,
    acknowledged_at
  )
  values (
    target_session.id,
    target_session.room_id,
    caller_id,
    target_session.revision,
    p_camera_ready,
    clock_timestamp()
  )
  on conflict (session_id, user_id)
  do update set
    revision = excluded.revision,
    camera_ready = excluded.camera_ready,
    acknowledged_at = excluded.acknowledged_at
  returning * into acknowledgement;

  return acknowledgement;
end;
$$;

create function public.schedule_capture_shot(
  p_session_id uuid,
  p_expected_revision bigint,
  p_lead_ms integer
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.photobooth_sessions;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.status <> 'waiting-for-ready' then
    raise exception using errcode = '55000', message = 'session_not_waiting_for_ready';
  end if;
  if target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;
  if p_lead_ms is null or p_lead_ms not between 1500 and 15000 then
    raise exception using errcode = '22023', message = 'invalid_capture_lead';
  end if;
  if (
    select count(*)
    from public.capture_session_readiness ready
    join public.room_members member
      on member.room_id = ready.room_id
     and member.user_id = ready.user_id
     and member.left_at is null
    where ready.session_id = target_session.id
      and ready.revision = target_session.revision
      and ready.camera_ready
  ) <> 2 then
    raise exception using errcode = '55000', message = 'both_participants_not_ready';
  end if;

  update public.photobooth_sessions
  set status = case when retake_shot_index is null and not full_retake
      then 'countdown' else 'retake-countdown' end,
      capture_at = clock_timestamp() + make_interval(secs => p_lead_ms::double precision / 1000),
      revision = revision + 1
  where id = target_session.id
  returning * into target_session;

  return target_session;
end;
$$;

create function public.submit_capture_metadata(
  p_session_id uuid,
  p_expected_revision bigint,
  p_shot_index integer,
  p_storage_path text,
  p_width integer,
  p_height integer,
  p_mime_type text,
  p_captured_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns public.captures
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_session public.photobooth_sessions;
  caller_role text;
  expected_path text;
  submitted_capture public.captures;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id;

  select member.role
  into caller_role
  from public.room_members member
  where member.room_id = target_session.room_id
    and member.user_id = caller_id
    and member.left_at is null;

  if target_session.id is null or caller_role is null then
    raise exception using errcode = '42501', message = 'membership_required';
  end if;
  if target_session.status not in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
    or target_session.revision <> p_expected_revision
    or target_session.current_shot_index <> p_shot_index then
    raise exception using errcode = '40001', message = 'capture_not_current';
  end if;
  if p_width not between 1 and 12000 or p_height not between 1 and 12000 then
    raise exception using errcode = '22023', message = 'invalid_capture_dimensions';
  end if;
  if p_captured_at is null
    or target_session.capture_at is null
    or p_captured_at < target_session.capture_at - interval '2 seconds'
    or p_captured_at > clock_timestamp() + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'invalid_capture_timestamp';
  end if;
  if p_mime_type not in ('image/webp', 'image/jpeg') then
    raise exception using errcode = '22023', message = 'invalid_capture_type';
  end if;
  if p_metadata is null
    or jsonb_typeof(p_metadata) <> 'object'
    or octet_length(p_metadata::text) > 8192 then
    raise exception using errcode = '22023', message = 'invalid_capture_metadata';
  end if;

  expected_path := format(
    'rooms/%s/sessions/%s/raw/%s/%s.%s',
    target_session.room_id,
    target_session.id,
    caller_id,
    p_shot_index,
    case p_mime_type when 'image/webp' then 'webp' else 'jpg' end
  );
  if p_storage_path <> expected_path then
    raise exception using errcode = '22023', message = 'invalid_capture_path';
  end if;
  if not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'bluebooth-media'
      and object.name = expected_path
  ) then
    raise exception using errcode = '55000', message = 'capture_object_missing';
  end if;

  insert into public.captures (
    session_id,
    room_id,
    shot_index,
    user_id,
    role,
    storage_path,
    width,
    height,
    mime_type,
    revision,
    captured_at,
    metadata
  )
  values (
    target_session.id,
    target_session.room_id,
    p_shot_index,
    caller_id,
    caller_role,
    expected_path,
    p_width,
    p_height,
    p_mime_type,
    target_session.revision,
    p_captured_at,
    p_metadata
  )
  on conflict (session_id, shot_index, user_id)
  do update set
    role = excluded.role,
    storage_path = excluded.storage_path,
    width = excluded.width,
    height = excluded.height,
    mime_type = excluded.mime_type,
    revision = excluded.revision,
    captured_at = excluded.captured_at,
    metadata = excluded.metadata
  returning * into submitted_capture;

  return submitted_capture;
end;
$$;

create function public.complete_capture_shot(
  p_session_id uuid,
  p_expected_revision bigint
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.photobooth_sessions;
  next_status text;
  next_index integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.status not in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
    or target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;
  if (
    select count(*)
    from public.captures capture
    where capture.session_id = target_session.id
      and capture.shot_index = target_session.current_shot_index
      and capture.revision = target_session.revision
  ) <> 2 then
    raise exception using errcode = '55000', message = 'captures_pending';
  end if;

  if target_session.retake_shot_index is not null and not target_session.full_retake then
    next_status := 'review';
    next_index := target_session.current_shot_index;
  elsif target_session.current_shot_index + 1 >= target_session.shot_count then
    next_status := 'review';
    next_index := target_session.current_shot_index;
  else
    next_status := 'waiting-for-ready';
    next_index := target_session.current_shot_index + 1;
  end if;

  update public.photobooth_sessions
  set status = next_status,
      current_shot_index = next_index,
      capture_at = null,
      revision = revision + 1,
      retake_shot_index = case when next_status = 'review' then null else retake_shot_index end,
      full_retake = case when next_status = 'review' then false else full_retake end
  where id = target_session.id
  returning * into target_session;

  delete from public.capture_session_readiness
  where session_id = target_session.id;

  if next_status = 'review' then
    update public.rooms set status = 'review' where id = target_session.room_id;
  end if;

  return target_session;
end;
$$;

create function public.prepare_capture_retake(
  p_session_id uuid,
  p_expected_revision bigint,
  p_shot_index integer default null
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.photobooth_sessions;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.status <> 'review' or target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;
  if p_shot_index is not null
    and (p_shot_index < 0 or p_shot_index >= target_session.shot_count) then
    raise exception using errcode = '22023', message = 'invalid_shot_index';
  end if;

  update public.photobooth_sessions
  set status = 'waiting-for-ready',
      current_shot_index = coalesce(p_shot_index, 0),
      capture_at = null,
      revision = revision + 1,
      retake_shot_index = p_shot_index,
      full_retake = p_shot_index is null
  where id = target_session.id
  returning * into target_session;

  delete from public.capture_session_readiness
  where session_id = target_session.id;
  update public.rooms set status = 'capturing' where id = target_session.room_id;

  return target_session;
end;
$$;

create function public.cancel_capture_session(
  p_session_id uuid,
  p_expected_revision bigint
)
returns public.photobooth_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.photobooth_sessions;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.revision <> p_expected_revision
    or target_session.status in ('completed', 'cancelled') then
    raise exception using errcode = '40001', message = 'session_revision_conflict';
  end if;

  update public.photobooth_sessions
  set status = 'cancelled',
      capture_at = null,
      revision = revision + 1
  where id = target_session.id
  returning * into target_session;

  update public.rooms
  set status = 'setup',
      active_session_id = null
  where id = target_session.room_id;

  return target_session;
end;
$$;

create function public.finalize_capture_result(
  p_session_id uuid,
  p_expected_revision bigint,
  p_storage_path text,
  p_width integer,
  p_height integer,
  p_metadata jsonb default '{}'::jsonb
)
returns public.results
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_session public.photobooth_sessions;
  expected_path text;
  final_result public.results;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_session
  from public.photobooth_sessions
  where id = p_session_id
  for update;

  if target_session.id is null or not public.is_room_host(target_session.room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if target_session.status <> 'review' or target_session.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'session_not_ready_for_result';
  end if;
  if (
    select count(*)
    from public.captures capture
    where capture.session_id = target_session.id
  ) <> target_session.shot_count * 2 then
    raise exception using errcode = '55000', message = 'captures_incomplete';
  end if;
  if p_width not between 1 and 12000 or p_height not between 1 and 12000 then
    raise exception using errcode = '22023', message = 'invalid_result_dimensions';
  end if;
  if p_metadata is null
    or jsonb_typeof(p_metadata) <> 'object'
    or octet_length(p_metadata::text) > 65536 then
    raise exception using errcode = '22023', message = 'invalid_result_metadata';
  end if;

  expected_path := format(
    'rooms/%s/sessions/%s/result/final.png',
    target_session.room_id,
    target_session.id
  );
  if p_storage_path <> expected_path or not exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'bluebooth-media'
      and object.name = expected_path
  ) then
    raise exception using errcode = '55000', message = 'result_object_missing';
  end if;

  insert into public.results (
    session_id,
    room_id,
    created_by,
    storage_path,
    width,
    height,
    metadata
  )
  values (
    target_session.id,
    target_session.room_id,
    caller_id,
    expected_path,
    p_width,
    p_height,
    p_metadata
  )
  on conflict (session_id)
  do update set
    storage_path = excluded.storage_path,
    width = excluded.width,
    height = excluded.height,
    metadata = excluded.metadata,
    deleted_at = null
  returning * into final_result;

  update public.photobooth_sessions
  set status = 'completed',
      completed_at = clock_timestamp(),
      revision = revision + 1
  where id = target_session.id;

  update public.rooms
  set status = 'completed'
  where id = target_session.room_id;

  return final_result;
end;
$$;

create function public.storage_raw_shot_index(p_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^rooms/[0-9a-fA-F-]{36}/sessions/[0-9a-fA-F-]{36}/raw/[0-9a-fA-F-]{36}/[0-9]{1,2}\.(webp|jpg)$'
      then split_part(split_part(p_name, '/', 7), '.', 1)::integer
    else null
  end;
$$;

drop policy bluebooth_media_insert_scoped on storage.objects;
drop policy bluebooth_media_update_scoped on storage.objects;

create policy bluebooth_media_insert_scoped
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (
      split_part(name, '/', 5) = 'raw'
      and split_part(name, '/', 6) = auth.uid()::text
      and exists (
        select 1
        from public.photobooth_sessions session
        where session.id = public.storage_session_id(name)
          and session.room_id = public.storage_room_id(name)
          and session.status in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
          and session.current_shot_index = public.storage_raw_shot_index(name)
      )
    )
    or (
      split_part(name, '/', 5) = 'frames'
      and split_part(name, '/', 6) = auth.uid()::text
      and exists (
        select 1
        from public.photobooth_sessions session
        where session.id = public.storage_session_id(name)
          and session.room_id = public.storage_room_id(name)
      )
    )
    or (
      split_part(name, '/', 5) = 'result'
      and split_part(name, '/', 6) = 'final.png'
      and public.is_room_host(public.storage_room_id(name))
      and exists (
        select 1
        from public.photobooth_sessions session
        where session.id = public.storage_session_id(name)
          and session.room_id = public.storage_room_id(name)
          and session.status = 'review'
      )
    )
  )
);

create policy bluebooth_media_update_scoped
on storage.objects for update to authenticated
using (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (split_part(name, '/', 5) in ('raw', 'frames') and split_part(name, '/', 6) = auth.uid()::text)
    or (split_part(name, '/', 5) = 'result' and public.is_room_host(public.storage_room_id(name)))
  )
)
with check (
  bucket_id = 'bluebooth-media'
  and public.is_active_room_member(public.storage_room_id(name))
  and (
    (
      split_part(name, '/', 5) = 'raw'
      and split_part(name, '/', 6) = auth.uid()::text
      and exists (
        select 1
        from public.photobooth_sessions session
        where session.id = public.storage_session_id(name)
          and session.room_id = public.storage_room_id(name)
          and session.status in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
          and session.current_shot_index = public.storage_raw_shot_index(name)
      )
    )
    or (
      split_part(name, '/', 5) = 'frames'
      and split_part(name, '/', 6) = auth.uid()::text
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.is_room_host(public.storage_room_id(name))
      and exists (
        select 1
        from public.photobooth_sessions session
        where session.id = public.storage_session_id(name)
          and session.room_id = public.storage_room_id(name)
          and session.status = 'review'
      )
    )
  )
);

drop policy captures_insert_own on public.captures;
drop policy captures_update_own on public.captures;

create policy captures_insert_own
on public.captures for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_room_member(room_id)
  and exists (
    select 1
    from public.room_members member
    where member.room_id = captures.room_id
      and member.user_id = auth.uid()
      and member.role = captures.role
      and member.left_at is null
  )
  and exists (
    select 1
    from public.photobooth_sessions session
    where session.id = captures.session_id
      and session.room_id = captures.room_id
      and session.status in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
      and session.current_shot_index = captures.shot_index
      and session.revision = captures.revision
  )
  and exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'bluebooth-media'
      and object.name = captures.storage_path
  )
  and storage_path = format(
    'rooms/%s/sessions/%s/raw/%s/%s.%s',
    room_id,
    session_id,
    auth.uid(),
    shot_index,
    case mime_type when 'image/webp' then 'webp' else 'jpg' end
  )
);

create policy captures_update_own
on public.captures for update to authenticated
using (user_id = auth.uid() and public.is_active_room_member(room_id))
with check (
  user_id = auth.uid()
  and public.is_active_room_member(room_id)
  and exists (
    select 1
    from public.photobooth_sessions session
    where session.id = captures.session_id
      and session.room_id = captures.room_id
      and session.status in ('countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads')
      and session.current_shot_index = captures.shot_index
      and session.revision = captures.revision
  )
  and exists (
    select 1
    from storage.objects object
    where object.bucket_id = 'bluebooth-media'
      and object.name = captures.storage_path
  )
  and storage_path = format(
    'rooms/%s/sessions/%s/raw/%s/%s.%s',
    room_id,
    session_id,
    auth.uid(),
    shot_index,
    case mime_type when 'image/webp' then 'webp' else 'jpg' end
  )
);

drop policy results_insert_host on public.results;

create policy results_insert_host
on public.results for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_room_host(room_id)
  and storage_path = format(
    'rooms/%s/sessions/%s/result/final.png',
    room_id,
    session_id
  )
  and exists (
    select 1
    from public.photobooth_sessions session
    where session.id = results.session_id
      and session.room_id = results.room_id
      and session.status = 'review'
      and (
        select count(*)
        from public.captures capture
        where capture.session_id = session.id
      ) = session.shot_count * 2
  )
);

revoke insert, update, delete on public.photobooth_sessions from authenticated;
revoke delete on public.captures from authenticated;
revoke insert, update, delete on public.results from authenticated;

revoke all on function public.create_capture_session(uuid, jsonb, integer) from public, anon;
revoke all on function public.get_capture_server_time(uuid) from public, anon;
revoke all on function public.attach_capture_custom_frame(uuid, bigint, text) from public, anon;
revoke all on function public.acknowledge_capture_ready(uuid, bigint, boolean) from public, anon;
revoke all on function public.schedule_capture_shot(uuid, bigint, integer) from public, anon;
revoke all on function public.submit_capture_metadata(uuid, bigint, integer, text, integer, integer, text, timestamptz, jsonb) from public, anon;
revoke all on function public.complete_capture_shot(uuid, bigint) from public, anon;
revoke all on function public.prepare_capture_retake(uuid, bigint, integer) from public, anon;
revoke all on function public.cancel_capture_session(uuid, bigint) from public, anon;
revoke all on function public.finalize_capture_result(uuid, bigint, text, integer, integer, jsonb) from public, anon;
revoke all on function public.storage_raw_shot_index(text) from public, anon;

grant execute on function public.create_capture_session(uuid, jsonb, integer) to authenticated;
grant execute on function public.get_capture_server_time(uuid) to authenticated;
grant execute on function public.attach_capture_custom_frame(uuid, bigint, text) to authenticated;
grant execute on function public.acknowledge_capture_ready(uuid, bigint, boolean) to authenticated;
grant execute on function public.schedule_capture_shot(uuid, bigint, integer) to authenticated;
grant execute on function public.submit_capture_metadata(uuid, bigint, integer, text, integer, integer, text, timestamptz, jsonb) to authenticated;
grant execute on function public.complete_capture_shot(uuid, bigint) to authenticated;
grant execute on function public.prepare_capture_retake(uuid, bigint, integer) to authenticated;
grant execute on function public.cancel_capture_session(uuid, bigint) to authenticated;
grant execute on function public.finalize_capture_result(uuid, bigint, text, integer, integer, jsonb) to authenticated;
grant execute on function public.storage_raw_shot_index(text) to authenticated;
