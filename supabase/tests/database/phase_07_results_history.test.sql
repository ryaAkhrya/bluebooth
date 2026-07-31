begin;

select plan(17);

insert into auth.users (
  id, instance_id, aud, role, is_anonymous, created_at, updated_at
)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

insert into public.rooms (
  id, code, name, owner_user_id, status, expires_at, created_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'HIST07',
  'History room',
  '11111111-1111-4111-8111-111111111111',
  'closed',
  now() - interval '1 day',
  now() - interval '2 days'
);

insert into public.room_members (
  room_id, user_id, role, display_name, joined_at, left_at
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'host',
    'Host',
    now() - interval '2 days',
    now() - interval '1 day'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'partner',
    'Partner',
    now() - interval '2 days',
    now() - interval '1 day'
  );

insert into public.photobooth_sessions (
  id,
  room_id,
  created_by,
  status,
  configuration,
  shot_count,
  current_shot_index,
  revision,
  created_at,
  completed_at
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'completed',
  '{"selectedGrid":"ig-square-4"}'::jsonb,
  1,
  0,
  2,
  now() - interval '2 days',
  now() - interval '1 day'
);

insert into storage.objects(bucket_id, name)
values
  (
    'bluebooth-media',
    'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/raw/11111111-1111-4111-8111-111111111111/0.webp'
  ),
  (
    'bluebooth-media',
    'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/result/final.png'
  );

insert into public.results (
  id,
  session_id,
  room_id,
  created_by,
  storage_path,
  width,
  height,
  metadata,
  created_at
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/result/final.png',
  1080,
  1080,
  '{"configuration":{"selectedGrid":"ig-square-4"}}'::jsonb,
  now() - interval '1 day'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.list_result_history()),
  1::bigint,
  'a former partner can list a private result after the room closes'
);
select is(
  (select can_delete from public.list_result_history()),
  false,
  'a partner cannot delete the host-created result'
);
select is(
  (select count(*) from public.results),
  1::bigint,
  'result RLS permits historical member access'
);
select is(
  (select count(*) from public.rooms),
  0::bigint,
  'historical result access does not expose the closed room row'
);
select is(
  (select count(*) from public.photobooth_sessions),
  0::bigint,
  'historical result access does not expose session rows'
);
select is(
  (
    select count(*)
    from storage.objects
    where name like '%/raw/%'
  ),
  0::bigint,
  'historical result access does not expose raw captures'
);
select is(
  (
    select count(*)
    from storage.objects
    where name like '%/result/final.png'
  ),
  1::bigint,
  'historical member can access only the authorized final object'
);
select throws_ok(
  $$ select * from public.soft_delete_result(
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
     ) $$,
  '42501',
  'result_delete_requires_creator',
  'partner cannot soft-delete the shared result'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.list_result_history()),
  0::bigint,
  'an unrelated anonymous user has no result history'
);
select is(
  (
    select count(*)
    from storage.objects
    where name like '%/result/final.png'
  ),
  0::bigint,
  'an unrelated anonymous user cannot access the final object'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.list_result_history()),
  1::bigint,
  'the former host can list the completed result'
);
select is(
  (select can_delete from public.list_result_history()),
  true,
  'the result creator receives delete authority'
);
select throws_ok(
  $$ select * from public.list_result_history(
       20,
       now(),
       null
     ) $$,
  '22023',
  'invalid_history_cursor',
  'partial history cursors are rejected'
);
select lives_ok(
  $$ select * from public.soft_delete_result(
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
     ) $$,
  'the result creator can soft-delete metadata'
);
select is(
  (select count(*) from public.list_result_history()),
  0::bigint,
  'soft-deleted results disappear from history immediately'
);
select lives_ok(
  $$ delete from storage.objects
     where bucket_id = 'bluebooth-media'
       and name = 'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/result/final.png' $$,
  'the creator can remove the object only after soft deletion'
);

reset role;

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'bluebooth-media'
      and name = 'rooms/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/sessions/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/result/final.png'
  ),
  0::bigint,
  'the final object row is removed by the authorized cleanup step'
);

select * from finish();

rollback;
