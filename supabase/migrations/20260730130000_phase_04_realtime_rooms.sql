create type public.room_settings_result as (
  room_id uuid,
  shared_settings jsonb,
  settings_revision bigint,
  updated_at timestamptz
);

create function public.is_valid_room_settings_patch(p_patch jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  layout jsonb;
begin
  if coalesce(jsonb_typeof(p_patch), 'null') <> 'object' then
    return false;
  end if;
  if (select count(*) from jsonb_object_keys(p_patch)) <> 1 then
    return false;
  end if;

  if p_patch ? 'selectedGrid' then
    return jsonb_typeof(p_patch->'selectedGrid') = 'string'
      and p_patch->>'selectedGrid' in (
        'ig-square-1', 'ig-square-2', 'ig-square-4',
        'ig-portrait-1', 'ig-portrait-2', 'ig-portrait-3', 'ig-portrait-4',
        'ig-story-1', 'ig-story-2', 'ig-story-3', 'ig-story-4',
        'strip-2', 'strip-3', 'strip-4', 'tall-6',
        'pc-2x2', 'pc-2x3', 'large-top-2', '2-small-large-bottom',
        'editorial-portrait', 'land-1', 'land-2', 'land-3', 'land-2x2',
        'wide-main-2-side', 'cinematic-3', 'editorial-landscape',
        'polaroid-1', 'polaroid-2', 'polaroid-4',
        'print-strip-2x2', 'print-strip-2x3', 'contact-3x3'
      );
  end if;

  if p_patch ? 'selectedFrame' then
    return jsonb_typeof(p_patch->'selectedFrame') = 'string'
      and p_patch->>'selectedFrame' in (
        'clean-white', 'powder-blue', 'thin-navy', 'double-line',
        'soft-paper', 'film-edge', 'minimal-caption', 'bottom-date',
        'top-label', 'rounded-print', 'pale-check', 'editorial-num'
      );
  end if;

  if p_patch ? 'timer' then
    return jsonb_typeof(p_patch->'timer') = 'number'
      and p_patch->>'timer' in ('3', '5', '10');
  end if;

  if p_patch ? 'layout' then
    layout := p_patch->'layout';
    if coalesce(jsonb_typeof(layout), 'null') <> 'object' then
      return false;
    end if;
    if (select count(*) from jsonb_object_keys(layout)) <> 4 then
      return false;
    end if;
    if exists (
      select 1
      from jsonb_object_keys(layout) as layout_key
      where layout_key not in ('gap', 'padding', 'radius', 'background')
    ) then
      return false;
    end if;
    return jsonb_typeof(layout->'gap') = 'number'
      and layout->>'gap' in ('0', '4', '8', '12', '16', '24')
      and jsonb_typeof(layout->'padding') = 'number'
      and layout->>'padding' in ('0', '8', '16', '24', '32')
      and jsonb_typeof(layout->'radius') = 'number'
      and layout->>'radius' in ('0', '8', '16', '24')
      and jsonb_typeof(layout->'background') = 'string'
      and layout->>'background' ~ '^#[0-9a-fA-F]{6}$';
  end if;

  return false;
end;
$$;

drop function public.create_room(text, text);

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
      insert into public.rooms(
        code,
        name,
        owner_user_id,
        shared_settings,
        expires_at
      )
      values (
        public.generate_room_code(),
        clean_room_name,
        current_user_id,
        '{
          "selectedGrid": "ig-square-4",
          "selectedFrame": "clean-white",
          "timer": 5,
          "layout": {
            "gap": 8,
            "padding": 16,
            "radius": 8,
            "background": "#ffffff"
          }
        }'::jsonb,
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

drop function public.update_room_settings(uuid, bigint, jsonb);

create function public.update_room_settings(
  p_room_id uuid,
  p_expected_revision bigint,
  p_settings_patch jsonb
)
returns setof public.room_settings_result
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
  if not public.is_active_room_member(p_room_id) then
    raise exception using errcode = '42501', message = 'membership_required';
  end if;
  if not public.is_valid_room_settings_patch(p_settings_patch) then
    raise exception using errcode = '22023', message = 'invalid_settings_patch';
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
    target_room.shared_settings,
    target_room.settings_revision,
    target_room.updated_at;
end;
$$;

create function public.enter_room_setup(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.is_active_room_member(p_room_id) then
    raise exception using errcode = '42501', message = 'membership_required';
  end if;

  update public.rooms
  set status = 'setup'
  where id = p_room_id
    and status in ('waiting', 'setup');

  if not found then
    raise exception using errcode = 'P0001', message = 'room_not_available';
  end if;
  return true;
end;
$$;

drop policy bluebooth_private_topics_select on realtime.messages;
drop policy bluebooth_private_topics_insert on realtime.messages;

create policy bluebooth_private_topics_select
on realtime.messages for select to authenticated
using (
  extension in ('presence', 'broadcast')
  and public.is_active_room_member(public.realtime_room_id(realtime.topic()))
);

create policy bluebooth_private_topics_insert
on realtime.messages for insert to authenticated
with check (
  extension in ('presence', 'broadcast')
  and public.is_active_room_member(public.realtime_room_id(realtime.topic()))
);

revoke all on function public.is_valid_room_settings_patch(jsonb) from public, anon;
revoke all on function public.create_room(text, text) from public, anon;
revoke all on function public.update_room_settings(uuid, bigint, jsonb) from public, anon;
revoke all on function public.enter_room_setup(uuid) from public, anon;

grant execute on function public.is_valid_room_settings_patch(jsonb) to authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.update_room_settings(uuid, bigint, jsonb) to authenticated;
grant execute on function public.enter_room_setup(uuid) to authenticated;
grant usage on type public.room_settings_result to authenticated;
