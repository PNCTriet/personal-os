-- VALIDATION ONLY. Smoke test of supabase/migrations/* (MVP v0). Rolls back.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'founder@howl.lab'),
  ('00000000-0000-0000-0000-000000000002', 'intruder@example.com');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
insert into companies (id, user_id, name) values ('c0000000-0000-0000-0000-000000000001', auth.uid(), 'HOWL LAB');
insert into projects (id, user_id, code, name) values
  ('10000000-0000-0000-0000-000000000001', auth.uid(), 'HOWL-POS-01', 'Personal OS'),
  ('10000000-0000-0000-0000-000000000002', auth.uid(), 'HOWL-VTO-01', 'Vietnam Tour Ops');
insert into tasks (id, user_id, project_id, title) values
  ('20000000-0000-0000-0000-000000000001', auth.uid(), '10000000-0000-0000-0000-000000000001', 'Scaffold'),
  ('20000000-0000-0000-0000-000000000002', auth.uid(), '10000000-0000-0000-0000-000000000001', 'CI');
update tasks set project_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000002';
insert into audit_logs (user_id, actor_type, source, action, category, entity_type, status)
values (auth.uid(), 'user', 'web', 'task.create', 'write', 'task', 'success');
do $$ begin
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000001') = 'HOWL-POS-01-T01', 'code';
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000002') = 'HOWL-VTO-01-T01', 're-code on move';
  assert (select previous_codes from tasks where id = '20000000-0000-0000-0000-000000000002') = '{HOWL-POS-01-T02}', 'alias kept';
  begin
    insert into tasks (user_id, title, kind) values (auth.uid(), 'x', 'follow_up');
    raise exception 'follow_up without target allowed';
  exception when check_violation then null; end;
  begin
    update tasks set status = 'done' where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'done without completed_at allowed';
  exception when check_violation then null; end;
  begin
    delete from audit_logs;
    raise exception 'audit delete allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from tasks) = 0, 'RLS hides tasks';
  assert (select count(*) from projects) = 0, 'RLS hides projects';
  assert (select count(*) from audit_logs) = 0, 'RLS hides audit';
end $$;
select set_config('request.jwt.claims', '{"client_id":"x"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  assert (select count(*) from tasks) = 0, 'OAuth client token blocked';
end $$;
rollback;
\echo MVP MIGRATION SMOKE PASSED
