create or replace function public.is_valid_room_settings_patch(p_patch jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  value jsonb;
begin
  if coalesce(jsonb_typeof(p_patch), 'null') <> 'object'
    or (select count(*) from jsonb_object_keys(p_patch)) <> 1 then
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
    value := p_patch->'layout';
    return coalesce(jsonb_typeof(value), 'null') = 'object'
      and (select count(*) from jsonb_object_keys(value)) = 4
      and value ?& array['gap', 'padding', 'radius', 'background']
      and jsonb_typeof(value->'gap') = 'number'
      and value->>'gap' in ('0', '4', '8', '12', '16', '24')
      and jsonb_typeof(value->'padding') = 'number'
      and value->>'padding' in ('0', '8', '16', '24', '32')
      and jsonb_typeof(value->'radius') = 'number'
      and value->>'radius' in ('0', '8', '16', '24')
      and jsonb_typeof(value->'background') = 'string'
      and value->>'background' ~ '^#[0-9a-fA-F]{6}$';
  end if;

  if p_patch ? 'frameOptions' then
    value := p_patch->'frameOptions';
    if coalesce(jsonb_typeof(value), 'null') <> 'object'
      or (select count(*) from jsonb_object_keys(value)) <> 5
      or not (value ?& array[
        'caption', 'borderColor', 'borderWidth', 'showDate', 'showRoom'
      ])
      or jsonb_typeof(value->'caption') <> 'string'
      or char_length(value->>'caption') > 30
      or jsonb_typeof(value->'borderColor') <> 'string'
      or value->>'borderColor' !~ '^#[0-9a-fA-F]{6}$'
      or jsonb_typeof(value->'borderWidth') <> 'number'
      or jsonb_typeof(value->'showDate') <> 'boolean'
      or jsonb_typeof(value->'showRoom') <> 'boolean' then
      return false;
    end if;
    return (value->>'borderWidth')::numeric between 0 and 24;
  end if;

  if p_patch ? 'cameraMode' then
    return jsonb_typeof(p_patch->'cameraMode') = 'string'
      and p_patch->>'cameraMode' in ('user', 'partner', 'split', 'alternate');
  end if;

  if p_patch ? 'swap' or p_patch ? 'timerSound' or p_patch ? 'flash' then
    value := case
      when p_patch ? 'swap' then p_patch->'swap'
      when p_patch ? 'timerSound' then p_patch->'timerSound'
      else p_patch->'flash'
    end;
    return jsonb_typeof(value) = 'boolean';
  end if;

  if p_patch ? 'shotDelay' then
    return jsonb_typeof(p_patch->'shotDelay') = 'number'
      and p_patch->>'shotDelay' in ('1', '2', '3', '5');
  end if;

  if p_patch ? 'cameraSettings' then
    value := p_patch->'cameraSettings';
    if coalesce(jsonb_typeof(value), 'null') <> 'object'
      or (select count(*) from jsonb_object_keys(value)) <> 8
      or not (value ?& array[
        'mirror', 'brightness', 'contrast', 'saturation',
        'warmth', 'zoom', 'fit', 'filter'
      ])
      or jsonb_typeof(value->'mirror') <> 'boolean'
      or jsonb_typeof(value->'brightness') <> 'number'
      or jsonb_typeof(value->'contrast') <> 'number'
      or jsonb_typeof(value->'saturation') <> 'number'
      or jsonb_typeof(value->'warmth') <> 'number'
      or jsonb_typeof(value->'zoom') <> 'number'
      or jsonb_typeof(value->'fit') <> 'string'
      or value->>'fit' not in ('cover', 'contain', 'fill')
      or jsonb_typeof(value->'filter') <> 'string'
      or value->>'filter' not in (
        'original', 'soft', 'cool', 'warm', 'clean', 'faded', 'mono', 'film'
      ) then
      return false;
    end if;
    return (value->>'brightness')::numeric between 0.5 and 1.5
      and (value->>'contrast')::numeric between 0.5 and 1.5
      and (value->>'saturation')::numeric between 0 and 2
      and (value->>'warmth')::numeric between -50 and 50
      and (value->>'zoom')::numeric between 1 and 1.8;
  end if;

  return false;
end;
$$;

create or replace function public.update_room_settings(
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
  if not public.is_room_host(p_room_id) then
    raise exception using errcode = '42501', message = 'host_required';
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

create or replace function public.enter_room_setup(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.is_room_host(p_room_id) then
    raise exception using errcode = '42501', message = 'host_required';
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

revoke all on function public.is_valid_room_settings_patch(jsonb) from public, anon;
revoke all on function public.update_room_settings(uuid, bigint, jsonb) from public, anon;
revoke all on function public.enter_room_setup(uuid) from public, anon;

grant execute on function public.is_valid_room_settings_patch(jsonb) to authenticated;
grant execute on function public.update_room_settings(uuid, bigint, jsonb) to authenticated;
grant execute on function public.enter_room_setup(uuid) to authenticated;
