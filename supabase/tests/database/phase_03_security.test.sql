begin;

select plan(14);

insert into auth.users (
  id, instance_id, aud, role, is_anonymous, created_at, updated_at
)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

insert into public.rooms (
  id, code, name, owner_user_id, expires_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'SEC123',
  'Security test',
  '11111111-1111-4111-8111-111111111111',
  now() + interval '2 hours'
);

insert into public.room_members (room_id, user_id, role, display_name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'host', 'Host'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'partner', 'Partner');

insert into public.photobooth_sessions (
  id, room_id, created_by, configuration, shot_count
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '{}'::jsonb,
  4
);

insert into public.captures (
  session_id, room_id, shot_index, user_id, role, storage_path, width, height, mime_type
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  0,
  '11111111-1111-4111-8111-111111111111',
  'host',
  'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/raw/11111111-1111-4111-8111-111111111111/0.webp',
  800,
  600,
  'image/webp'
);

insert into public.results (
  session_id, room_id, created_by, storage_path, width, height
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/result/final.png',
  1080,
  1080
);

select is(
  (select public from storage.buckets where id = 'bluebooth-media'),
  false,
  'the media bucket is private'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.join_room('SEC123', 'Third') $$,
  'P0001',
  'room_full',
  'a third active user cannot join'
);
select results_eq(
  $$ select count(*)::bigint from public.rooms where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[0::bigint],
  'a non-member cannot read the room'
);
select results_eq(
  $$ select count(*)::bigint from public.photobooth_sessions where room_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[0::bigint],
  'a non-member cannot read sessions'
);
select results_eq(
  $$ select count(*)::bigint from public.captures where room_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[0::bigint],
  'a non-member cannot read captures'
);
select results_eq(
  $$ select count(*)::bigint from public.results where room_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  array[0::bigint],
  'a non-member cannot read results'
);
select throws_ok(
  $$ insert into public.rooms(code, name, owner_user_id, expires_at)
     values ('BAD123', 'Blocked', '33333333-3333-4333-8333-333333333333', now() + interval '1 hour') $$,
  '42501',
  'permission denied for table rooms',
  'direct room inserts are denied'
);
select throws_ok(
  $$ insert into public.room_members(room_id, user_id, role, display_name)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'partner', 'Third') $$,
  '42501',
  'permission denied for table room_members',
  'direct membership inserts are denied'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ insert into public.captures(
       session_id, room_id, shot_index, user_id, role, storage_path, width, height, mime_type
     ) values (
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       1,
       '22222222-2222-4222-8222-222222222222',
       'partner',
       'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/raw/11111111-1111-4111-8111-111111111111/1.webp',
       800, 600, 'image/webp'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "captures"',
  'a member cannot submit metadata for another user path'
);
select throws_ok(
  $$ insert into storage.objects(bucket_id, name)
     values (
       'bluebooth-media',
       'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/raw/11111111-1111-4111-8111-111111111111/1.webp'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a member cannot upload into another user raw path'
);
select lives_ok(
  $$ select * from public.update_room_settings(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       1,
       '{"timer": 3}'::jsonb
     ) $$,
  'an active partner can update shared setup settings'
);
select throws_ok(
  $$ insert into storage.objects(bucket_id, name)
     values (
       'bluebooth-media',
       'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/raw/22222222-2222-4222-8222-222222222222/1.webp'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'raw uploads require a currently scheduled synchronized shot'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select * from public.create_room('Host', 'Another room') $$,
  'an authenticated anonymous user can create a room'
);
select lives_ok(
  $$ select * from public.update_room_settings(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       0,
       '{"timer": 3}'::jsonb
     ) $$,
  'the host can update settings at the expected revision'
);

select * from finish();
rollback;
