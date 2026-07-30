create extension if not exists pgcrypto with schema extensions;

create type public.room_access as (
  room_id uuid,
  code text,
  name text,
  role text,
  status text,
  settings_revision bigint,
  expires_at timestamptz
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null default 'Bluebooth',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'setup', 'capturing', 'review', 'completed', 'closed')),
  shared_settings jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(shared_settings) = 'object'
      and octet_length(shared_settings::text) <= 65536
    ),
  settings_revision bigint not null default 0 check (settings_revision >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_code_format check (code ~ '^[A-Z0-9]{6}$'),
  constraint rooms_name_length check (char_length(btrim(name)) between 1 and 48),
  constraint rooms_expiry_after_creation check (expires_at > created_at)
);

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host', 'partner')),
  display_name text not null,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  constraint room_members_display_name_length
    check (char_length(btrim(display_name)) between 1 and 32),
  constraint room_members_room_user_unique unique (room_id, user_id)
);

create unique index room_members_one_active_role
  on public.room_members(room_id, role)
  where left_at is null;
create index room_members_active_user
  on public.room_members(user_id, room_id)
  where left_at is null;
create index rooms_expiry on public.rooms(expires_at) where status <> 'closed';

create table public.photobooth_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'preparing'
    check (status in ('preparing', 'countdown', 'capturing', 'review', 'completed', 'cancelled')),
  configuration jsonb not null
    check (
      jsonb_typeof(configuration) = 'object'
      and octet_length(configuration::text) <= 65536
    ),
  shot_count integer not null check (shot_count between 1 and 64),
  current_shot_index integer not null default 0
    check (current_shot_index between 0 and 63),
  capture_at timestamptz,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint photobooth_sessions_id_room_unique unique (id, room_id),
  constraint photobooth_sessions_current_shot_valid
    check (current_shot_index < shot_count),
  constraint photobooth_sessions_completion_time
    check (completed_at is null or completed_at >= created_at)
);

create index photobooth_sessions_room_status
  on public.photobooth_sessions(room_id, status, created_at desc);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  room_id uuid not null,
  shot_index integer not null check (shot_index between 0 and 63),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('host', 'partner')),
  storage_path text not null,
  width integer not null check (width between 1 and 12000),
  height integer not null check (height between 1 and 12000),
  mime_type text not null check (mime_type in ('image/webp', 'image/jpeg')),
  created_at timestamptz not null default now(),
  constraint captures_session_room_fk
    foreign key (session_id, room_id)
    references public.photobooth_sessions(id, room_id)
    on delete cascade,
  constraint captures_session_shot_user_unique
    unique (session_id, shot_index, user_id)
);

create index captures_room_session on public.captures(room_id, session_id, shot_index);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  room_id uuid not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  width integer not null check (width between 1 and 12000),
  height integer not null check (height between 1 and 12000),
  metadata jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 65536
    ),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint results_session_room_fk
    foreign key (session_id, room_id)
    references public.photobooth_sessions(id, room_id)
    on delete cascade,
  constraint results_deleted_after_creation
    check (deleted_at is null or deleted_at >= created_at)
);

create index results_room_created on public.results(room_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

create function public.enforce_active_room_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
begin
  if new.left_at is not null then
    return new;
  end if;

  select count(*)
  into active_count
  from public.room_members member
  where member.room_id = new.room_id
    and member.left_at is null
    and member.id <> new.id;

  if active_count >= 2 then
    raise exception using errcode = 'P0001', message = 'room_full';
  end if;
  return new;
end;
$$;

create trigger room_members_enforce_capacity
before insert or update of left_at, room_id on public.room_members
for each row execute function public.enforce_active_room_capacity();

revoke all on function public.set_updated_at() from public;
revoke all on function public.enforce_active_room_capacity() from public;
