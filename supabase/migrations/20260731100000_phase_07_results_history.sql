create index room_members_history_user
  on public.room_members(user_id, room_id);

create function public.is_result_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.room_members member
      where member.room_id = p_room_id
        and member.user_id = auth.uid()
    );
$$;

create function public.list_result_history(
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  result_id uuid,
  session_id uuid,
  room_id uuid,
  room_code text,
  room_name text,
  storage_path text,
  width integer,
  height integer,
  metadata jsonb,
  created_at timestamptz,
  can_delete boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'invalid_history_cursor';
  end if;

  return query
  select
    result.id,
    result.session_id,
    result.room_id,
    room.code,
    room.name,
    result.storage_path,
    result.width,
    result.height,
    result.metadata,
    result.created_at,
    result.created_by = auth.uid()
  from public.results result
  join public.rooms room on room.id = result.room_id
  join public.room_members member
    on member.room_id = result.room_id
   and member.user_id = auth.uid()
  where result.deleted_at is null
    and (
      p_before_created_at is null
      or (result.created_at, result.id) < (p_before_created_at, p_before_id)
    )
  order by result.created_at desc, result.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

create function public.soft_delete_result(p_result_id uuid)
returns public.results
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_result public.results;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select *
  into target_result
  from public.results
  where id = p_result_id
  for update;

  if target_result.id is null
    or not public.is_result_room_member(target_result.room_id) then
    raise exception using errcode = '42501', message = 'result_access_denied';
  end if;
  if target_result.created_by <> caller_id then
    raise exception using errcode = '42501', message = 'result_delete_requires_creator';
  end if;

  if target_result.deleted_at is null then
    update public.results
    set deleted_at = clock_timestamp()
    where id = target_result.id
    returning * into target_result;
  end if;

  return target_result;
end;
$$;

create function public.can_delete_result_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.results result
      where result.storage_path = p_name
        and result.created_by = auth.uid()
        and result.deleted_at is not null
    );
$$;

create function public.can_access_result_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.results result
      join public.room_members member
        on member.room_id = result.room_id
       and member.user_id = auth.uid()
      where result.storage_path = p_name
        and result.deleted_at is null
    );
$$;

drop policy results_select_members on public.results;

create policy results_select_members
on public.results for select to authenticated
using (
  deleted_at is null
  and public.is_result_room_member(room_id)
);

drop policy bluebooth_media_select_members on storage.objects;

create policy bluebooth_media_select_members
on storage.objects for select to authenticated
using (
  bucket_id = 'bluebooth-media'
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and public.is_active_room_member(public.storage_room_id(name))
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.can_access_result_object(name)
    )
  )
);

drop policy bluebooth_media_delete_scoped on storage.objects;

create policy bluebooth_media_delete_scoped
on storage.objects for delete to authenticated
using (
  bucket_id = 'bluebooth-media'
  and (
    (
      split_part(name, '/', 5) in ('raw', 'frames')
      and split_part(name, '/', 6) = auth.uid()::text
      and public.is_active_room_member(public.storage_room_id(name))
    )
    or (
      split_part(name, '/', 5) = 'result'
      and public.can_delete_result_object(name)
    )
  )
);

revoke all on function public.is_result_room_member(uuid) from public, anon;
revoke all on function public.list_result_history(integer, timestamptz, uuid) from public, anon;
revoke all on function public.soft_delete_result(uuid) from public, anon;
revoke all on function public.can_delete_result_object(text) from public, anon;
revoke all on function public.can_access_result_object(text) from public, anon;

grant execute on function public.is_result_room_member(uuid) to authenticated;
grant execute on function public.list_result_history(integer, timestamptz, uuid) to authenticated;
grant execute on function public.soft_delete_result(uuid) to authenticated;
grant execute on function public.can_delete_result_object(text) to authenticated;
grant execute on function public.can_access_result_object(text) to authenticated;
