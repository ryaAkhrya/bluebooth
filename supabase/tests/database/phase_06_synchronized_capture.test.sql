begin;

select plan(17);

insert into auth.users (
  id, instance_id, aud, role, is_anonymous, created_at, updated_at
)
values
  ('77777777-7777-4777-8777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('88888888-8888-4888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('99999999-9999-4999-8999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table phase06_room_access on commit drop as
select * from public.create_room('Host', 'Synchronized capture');

reset role;
grant select on phase06_room_access to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select * from public.join_room(
       (select code from phase06_room_access),
       'Partner'
     ) $$,
  'partner joins before session preparation'
);

select throws_ok(
  $$ select * from public.create_capture_session(
       (select room_id from phase06_room_access),
       '{"selectedGrid":"ig-square-4"}'::jsonb,
       1
     ) $$,
  '42501',
  'host_required',
  'partner cannot create an authoritative session'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table phase06_session on commit drop as
select *
from public.create_capture_session(
  (select room_id from phase06_room_access),
  '{"selectedGrid":"ig-square-4","selectedFrame":"clean-white","timer":3,"layout":{"gap":8,"padding":16,"radius":8,"background":"#ffffff"}}'::jsonb,
  1
);

reset role;
grant select on phase06_session to authenticated;

select is(
  (select status from phase06_session),
  'waiting-for-ready',
  'new session waits for both readiness acknowledgements'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select * from public.acknowledge_capture_ready(
       (select id from phase06_session),
       0,
       true
     ) $$,
  'host acknowledges local camera readiness'
);

select throws_ok(
  $$ select * from public.schedule_capture_shot(
       (select id from phase06_session),
       0,
       1500
     ) $$,
  '55000',
  'both_participants_not_ready',
  'countdown cannot start before partner readiness'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select * from public.acknowledge_capture_ready(
       (select id from phase06_session),
       0,
       true
     ) $$,
  'partner acknowledges local camera readiness'
);

select throws_ok(
  $$ select * from public.schedule_capture_shot(
       (select id from phase06_session),
       0,
       1500
     ) $$,
  '42501',
  'host_required',
  'partner cannot schedule countdown'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (public.schedule_capture_shot(
    (select id from phase06_session),
    0,
    1500
  )).status,
  'countdown',
  'host schedules one server-timestamp countdown'
);

insert into storage.objects(bucket_id, name)
values (
  'bluebooth-media',
  format(
    'rooms/%s/sessions/%s/raw/77777777-7777-4777-8777-777777777777/0.webp',
    (select room_id from phase06_session),
    (select id from phase06_session)
  )
);

select lives_ok(
  $$ select * from public.submit_capture_metadata(
       (select id from phase06_session),
       1,
       0,
       format(
         'rooms/%s/sessions/%s/raw/77777777-7777-4777-8777-777777777777/0.webp',
         (select room_id from phase06_session),
         (select id from phase06_session)
       ),
       1280,
       960,
       'image/webp',
       (select capture_at from public.photobooth_sessions where id = (select id from phase06_session)),
       '{"sourceWidth":1280}'::jsonb
     ) $$,
  'host submits its own current-shot metadata'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',
  true
);
set local role authenticated;

insert into storage.objects(bucket_id, name)
values (
  'bluebooth-media',
  format(
    'rooms/%s/sessions/%s/raw/88888888-8888-4888-8888-888888888888/0.webp',
    (select room_id from phase06_session),
    (select id from phase06_session)
  )
);

select lives_ok(
  $$ select * from public.submit_capture_metadata(
       (select id from phase06_session),
       1,
       0,
       format(
         'rooms/%s/sessions/%s/raw/88888888-8888-4888-8888-888888888888/0.webp',
         (select room_id from phase06_session),
         (select id from phase06_session)
       ),
       1280,
       960,
       'image/webp',
       (select capture_at from public.photobooth_sessions where id = (select id from phase06_session)),
       '{}'::jsonb
     ) $$,
  'partner submits only its own local capture'
);

select lives_ok(
  $$ select * from public.submit_capture_metadata(
       (select id from phase06_session),
       1,
       0,
       format(
         'rooms/%s/sessions/%s/raw/88888888-8888-4888-8888-888888888888/0.webp',
         (select room_id from phase06_session),
         (select id from phase06_session)
       ),
       1280,
       960,
       'image/webp',
       (select capture_at from public.photobooth_sessions where id = (select id from phase06_session)),
       '{"retry":true}'::jsonb
     ) $$,
  'metadata submission is retry-safe'
);

select is(
  (
    select count(*)::integer
    from public.captures
    where session_id = (select id from phase06_session)
      and user_id = '88888888-8888-4888-8888-888888888888'
  ),
  1,
  'retry does not create a duplicate capture row'
);

select throws_ok(
  $$ select * from public.complete_capture_shot(
       (select id from phase06_session),
       1
     ) $$,
  '42501',
  'host_required',
  'partner cannot advance the session'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (public.complete_capture_shot(
    (select id from phase06_session),
    1
  )).status,
  'review',
  'host advances only after both current captures exist'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.finalize_capture_result(
       (select id from phase06_session),
       2,
       format(
         'rooms/%s/sessions/%s/result/final.png',
         (select room_id from phase06_session),
         (select id from phase06_session)
       ),
       1080,
       1080,
       '{}'::jsonb
     ) $$,
  '42501',
  'host_required',
  'partner cannot create the authoritative result'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',
  true
);
set local role authenticated;

insert into storage.objects(bucket_id, name)
values (
  'bluebooth-media',
  format(
    'rooms/%s/sessions/%s/result/final.png',
    (select room_id from phase06_session),
    (select id from phase06_session)
  )
);

select is(
  (public.finalize_capture_result(
    (select id from phase06_session),
    2,
    format(
      'rooms/%s/sessions/%s/result/final.png',
      (select room_id from phase06_session),
      (select id from phase06_session)
    ),
    1080,
    1080,
    '{"phase":6}'::jsonb
  )).storage_path,
  format(
    'rooms/%s/sessions/%s/result/final.png',
    (select room_id from phase06_session),
    (select id from phase06_session)
  ),
  'host finalizes one private result for a valid review session'
);

select is(
  (
    select status
    from public.photobooth_sessions
    where id = (select id from phase06_session)
  ),
  'completed',
  'finalization completes the durable session'
);

select * from finish();
rollback;
