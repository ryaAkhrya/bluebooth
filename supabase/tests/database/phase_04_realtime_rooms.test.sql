begin;

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, is_anonymous, created_at, updated_at
)
values
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('55555555-5555-4555-8555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('66666666-6666-4666-8666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table phase04_room_access on commit drop as
select * from public.create_room('Host', 'Realtime test');

reset role;

select is(
  (
    select shared_settings->>'selectedGrid'
    from public.rooms
    where id = (select room_id from phase04_room_access)
  ),
  'ig-square-4',
  'new rooms receive durable shared setup defaults'
);

select is(
  (select role from phase04_room_access),
  'host',
  'room creation returns host access'
);

grant select on phase04_room_access to authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select * from public.join_room(
      (select code from phase04_room_access),
      'Partner'
    )
  $$,
  'a partner can join the room'
);

select throws_ok(
  $$
    select * from public.update_room_settings(
      (select room_id from phase04_room_access),
      0,
      '{"selectedFrame":"powder-blue"}'::jsonb
    )
  $$,
  '42501',
  'host_required',
  'a partner cannot update shared booth settings'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select * from public.update_room_settings(
      (select room_id from phase04_room_access),
      0,
      '{"cameraSettings":{"mirror":false,"brightness":1.1,"contrast":1,"saturation":1,"warmth":0,"zoom":1,"fit":"cover","filter":"original"}}'::jsonb
    )
  $$,
  'the host can update synchronized camera settings'
);

select throws_ok(
  $$
    select * from public.update_room_settings(
      (select room_id from phase04_room_access),
      1,
      '{"cameraSettings":{"mirror":false}}'::jsonb
    )
  $$,
  '22023',
  'invalid_settings_patch',
  'local-only camera settings are rejected'
);

select throws_ok(
  $$
    select * from public.update_room_settings(
      (
        select id
        from public.rooms
        where owner_user_id = '44444444-4444-4444-8444-444444444444'
      ),
      0,
      '{"timer":10}'::jsonb
    )
  $$,
  '40001',
  'settings_revision_conflict',
  'stale settings revisions are rejected'
);

select lives_ok(
  $$
    select public.enter_room_setup(
      (select room_id from phase04_room_access)
    )
  $$,
  'an active member can enter setup'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.enter_room_setup(
      (select room_id from phase04_room_access)
    )
  $$,
  '42501',
  'host_required',
  'a non-member cannot change room lifecycle state'
);

select results_eq(
  $$
    select count(*)::bigint
    from realtime.messages
    where topic = (
      'room:' || (select room_id::text from phase04_room_access)
    )
  $$,
  array[0::bigint],
  'a non-member cannot read a private room topic'
);

select * from finish();
rollback;
