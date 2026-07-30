create function public.is_active_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members member
    join public.rooms room on room.id = member.room_id
    where member.room_id = p_room_id
      and member.user_id = auth.uid()
      and member.left_at is null
      and room.status <> 'closed'
      and room.expires_at > now()
  );
$$;

create function public.is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members member
    join public.rooms room on room.id = member.room_id
    where member.room_id = p_room_id
      and member.user_id = auth.uid()
      and member.role = 'host'
      and member.left_at is null
      and room.status <> 'closed'
      and room.expires_at > now()
  );
$$;

create function public.generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated text := '';
  position integer;
begin
  for position in 1..6 loop
    generated := generated || substr(
      alphabet,
      1 + floor(random() * char_length(alphabet))::integer,
      1
    );
  end loop;
  return generated;
end;
$$;

create function public.create_room(
  p_display_name text,
  p_room_name text default 'Bluebooth'
)
returns setof public.room_access
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_display_name text := btrim(p_display_name);
  clean_room_name text := coalesce(nullif(btrim(p_room_name), ''), 'Bluebooth');
  created_room public.rooms;
  attempt integer;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if char_length(clean_display_name) not between 1 and 32 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;
  if char_length(clean_room_name) not between 1 and 48 then
    raise exception using errcode = '22023', message = 'invalid_room_name';
  end if;

  for attempt in 1..12 loop
    begin
      insert into public.rooms(code, name, owner_user_id, expires_at)
      values (
        public.generate_room_code(),
        clean_room_name,
        current_user_id,
        now() + interval '2 hours'
      )
      returning * into created_room;
      exit;
    exception when unique_violation then
      if attempt = 12 then
        raise exception using errcode = 'P0001', message = 'room_code_generation_failed';
      end if;
    end;
  end loop;

  insert into public.room_members(room_id, user_id, role, display_name)
  values (created_room.id, current_user_id, 'host', clean_display_name);

  return query
  select
    created_room.id,
    created_room.code,
    created_room.name,
    'host'::text,
    created_room.status,
    created_room.settings_revision,
    created_room.expires_at;
end;
$$;

create function public.join_room(
  p_room_code text,
  p_display_name text
)
returns setof public.room_access
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(p_room_code));
  clean_display_name text := btrim(p_display_name);
  target_room public.rooms;
  existing_member public.room_members;
  active_count integer;
  assigned_role text := 'partner';
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if normalized_code !~ '^[A-Z0-9]{6}$' then
    raise exception using errcode = '22023', message = 'invalid_room_code';
  end if;
  if char_length(clean_display_name) not between 1 and 32 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;

  select *
  into target_room
  from public.rooms room
  where room.code = normalized_code
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.status = 'closed' then
    raise exception using errcode = 'P0001', message = 'room_closed';
  end if;
  if target_room.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'room_expired';
  end if;

  select *
  into existing_member
  from public.room_members member
  where member.room_id = target_room.id
    and member.user_id = current_user_id;

  if found and existing_member.left_at is null then
    update public.room_members
    set display_name = clean_display_name, last_seen_at = now()
    where id = existing_member.id;
    assigned_role := existing_member.role;
  else
    select count(*)
    into active_count
    from public.room_members member
    where member.room_id = target_room.id
      and member.left_at is null;

    if active_count >= 2 then
      raise exception using errcode = 'P0001', message = 'room_full';
    end if;

    if existing_member.id is not null then
      update public.room_members
      set
        role = assigned_role,
        display_name = clean_display_name,
        joined_at = now(),
        last_seen_at = now(),
        left_at = null
      where id = existing_member.id;
    else
      insert into public.room_members(room_id, user_id, role, display_name)
      values (target_room.id, current_user_id, assigned_role, clean_display_name);
    end if;
  end if;

  return query
  select
    target_room.id,
    target_room.code,
    target_room.name,
    assigned_role,
    target_room.status,
    target_room.settings_revision,
    target_room.expires_at;
end;
$$;

create function public.leave_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.rooms;
  leaving_member public.room_members;
  remaining_member public.room_members;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_room
  from public.rooms room
  where room.id = p_room_id
  for update;

  if not found then
    return false;
  end if;

  select *
  into leaving_member
  from public.room_members member
  where member.room_id = p_room_id
    and member.user_id = current_user_id
    and member.left_at is null
  for update;

  if not found then
    return false;
  end if;

  update public.room_members
  set left_at = now(), last_seen_at = now()
  where id = leaving_member.id;

  if leaving_member.role = 'host' then
    select *
    into remaining_member
    from public.room_members member
    where member.room_id = p_room_id
      and member.left_at is null
    order by member.joined_at
    limit 1
    for update;

    if found then
      update public.room_members set role = 'host' where id = remaining_member.id;
      update public.rooms set owner_user_id = remaining_member.user_id where id = p_room_id;
    else
      update public.rooms
      set status = 'closed', expires_at = greatest(created_at + interval '1 second', least(expires_at, now()))
      where id = p_room_id;
    end if;
  end if;

  return true;
end;
$$;

create function public.update_room_settings(
  p_room_id uuid,
  p_expected_revision bigint,
  p_settings_patch jsonb
)
returns setof public.room_access
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.rooms;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.is_room_host(p_room_id) then
    raise exception using errcode = '42501', message = 'host_required';
  end if;
  if jsonb_typeof(p_settings_patch) <> 'object' then
    raise exception using errcode = '22023', message = 'settings_patch_must_be_object';
  end if;

  select *
  into target_room
  from public.rooms room
  where room.id = p_room_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'room_not_found';
  end if;
  if target_room.settings_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'settings_revision_conflict';
  end if;

  update public.rooms
  set
    shared_settings = shared_settings || p_settings_patch,
    settings_revision = settings_revision + 1
  where id = p_room_id
  returning * into target_room;

  return query
  select
    target_room.id,
    target_room.code,
    target_room.name,
    'host'::text,
    target_room.status,
    target_room.settings_revision,
    target_room.expires_at;
end;
$$;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.photobooth_sessions enable row level security;
alter table public.captures enable row level security;
alter table public.results enable row level security;

create policy rooms_select_active_members
on public.rooms for select to authenticated
using (public.is_active_room_member(id));

create policy room_members_select_same_room
on public.room_members for select to authenticated
using (left_at is null and public.is_active_room_member(room_id));

create policy sessions_select_members
on public.photobooth_sessions for select to authenticated
using (public.is_active_room_member(room_id));

create policy sessions_insert_host
on public.photobooth_sessions for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_room_host(room_id)
);

create policy sessions_update_host
on public.photobooth_sessions for update to authenticated
using (public.is_room_host(room_id))
with check (public.is_room_host(room_id));

create policy sessions_delete_host
on public.photobooth_sessions for delete to authenticated
using (public.is_room_host(room_id));

create policy captures_select_members
on public.captures for select to authenticated
using (public.is_active_room_member(room_id));

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
  and storage_path = format(
    'rooms/%s/sessions/%s/raw/%s/%s.%s',
    room_id,
    session_id,
    user_id,
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
  and storage_path = format(
    'rooms/%s/sessions/%s/raw/%s/%s.%s',
    room_id,
    session_id,
    user_id,
    shot_index,
    case mime_type when 'image/webp' then 'webp' else 'jpg' end
  )
);

create policy results_select_members
on public.results for select to authenticated
using (public.is_active_room_member(room_id));

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
);

create policy results_update_host
on public.results for update to authenticated
using (public.is_room_host(room_id))
with check (public.is_room_host(room_id));

create policy results_delete_host
on public.results for delete to authenticated
using (public.is_room_host(room_id));

revoke all on public.rooms, public.room_members, public.photobooth_sessions, public.captures, public.results
  from anon, authenticated;
grant select on public.rooms, public.room_members, public.photobooth_sessions, public.captures, public.results
  to authenticated;
grant insert on public.photobooth_sessions, public.captures, public.results to authenticated;
grant update(status, configuration, current_shot_index, capture_at, revision, completed_at)
  on public.photobooth_sessions to authenticated;
grant update(storage_path, width, height, mime_type)
  on public.captures to authenticated;
grant update(metadata, deleted_at) on public.results to authenticated;
grant delete on public.photobooth_sessions, public.results to authenticated;

revoke all on function public.is_active_room_member(uuid) from public, anon;
revoke all on function public.is_room_host(uuid) from public, anon;
revoke all on function public.generate_room_code() from public, anon, authenticated;
revoke all on function public.create_room(text, text) from public, anon;
revoke all on function public.join_room(text, text) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
revoke all on function public.update_room_settings(uuid, bigint, jsonb) from public, anon;

grant execute on function public.is_active_room_member(uuid) to authenticated;
grant execute on function public.is_room_host(uuid) to authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text, text) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.update_room_settings(uuid, bigint, jsonb) to authenticated;
grant usage on type public.room_access to authenticated;
