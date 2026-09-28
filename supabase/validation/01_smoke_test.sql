-- VALIDATION ONLY. Behavioural smoke test of the proposed schema. Runs in a
-- transaction and rolls back. Every check raises on failure (ON_ERROR_STOP=1).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'founder@howl.lab'),
  ('00000000-0000-0000-0000-000000000002', 'intruder@example.com');

do $$ begin
  assert (select count(*) from profiles) = 2, 'profile auto-created per auth user';
end $$;

-- Act as the owner through RLS, exactly like a Supabase user JWT.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

insert into projects (id, user_id, code, name)
values ('10000000-0000-0000-0000-000000000001', auth.uid(), 'HOWL-VTO-01', 'Vietnam Tour Ops'),
       ('10000000-0000-0000-0000-000000000002', auth.uid(), 'HOWL-POS-01', 'Personal OS');

insert into tasks (id, user_id, project_id, title) values
  ('20000000-0000-0000-0000-000000000001', auth.uid(), '10000000-0000-0000-0000-000000000001', 'Draft itinerary'),
  ('20000000-0000-0000-0000-000000000002', auth.uid(), '10000000-0000-0000-0000-000000000001', 'Book hotels'),
  ('20000000-0000-0000-0000-000000000003', auth.uid(), null, 'Inbox idea');

do $$ begin
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000001') = 'HOWL-VTO-01-T01', 'first code';
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000002') = 'HOWL-VTO-01-T02', 'second code';
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000003') is null, 'inbox has no code';
end $$;

-- Inbox task gets a code when assigned; moved task keeps its old code as alias.
update tasks set project_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000003';
update tasks set project_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000002';
update tasks set code = 'HACKED' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000003') = 'HOWL-POS-01-T01', 'assigned code';
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000002') = 'HOWL-POS-01-T02', 'moved code';
  assert (select previous_codes from tasks where id = '20000000-0000-0000-0000-000000000002') = array['HOWL-VTO-01-T02'], 'alias kept';
  assert (select code from tasks where id = '20000000-0000-0000-0000-000000000001') = 'HOWL-VTO-01-T01', 'code immutable';
end $$;

-- Project code immutable.
do $$ begin
  begin
    update projects set code = 'HOWL-XXX-01' where code = 'HOWL-VTO-01';
    raise exception 'project code change was allowed';
  exception when check_violation then null; end;
end $$;

-- Dependencies: cycle rejected.
insert into task_dependencies (task_id, depends_on_task_id, user_id) values
  ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', auth.uid()),
  ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', auth.uid());
do $$ begin
  begin
    insert into task_dependencies (task_id, depends_on_task_id, user_id)
    values ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', auth.uid());
    raise exception 'cycle was allowed';
  exception when check_violation then null; end;
end $$;

-- done <-> completed_at constraint.
do $$ begin
  begin
    update tasks set status = 'done' where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'done without completed_at allowed';
  exception when check_violation then null; end;
end $$;
update tasks set status = 'done', completed_at = now() where id = '20000000-0000-0000-0000-000000000001';

-- Finance: deterministic balances, atomic transfer, currency guard, debt outstanding.
insert into finance_accounts (id, user_id, name, type, currency, opening_balance_minor) values
  ('30000000-0000-0000-0000-000000000001', auth.uid(), 'Techcombank', 'bank', 'VND', 10000000),
  ('30000000-0000-0000-0000-000000000002', auth.uid(), 'Cash', 'cash', 'VND', 0),
  ('30000000-0000-0000-0000-000000000003', auth.uid(), 'Wise USD', 'bank', 'USD', 0);
insert into people (id, user_id, display_name, emails) values
  ('40000000-0000-0000-0000-000000000001', auth.uid(), 'Minh', array['minh@example.com']::citext[]);
insert into debts (id, user_id, direction, person_id, principal_minor, currency) values
  ('50000000-0000-0000-0000-000000000001', auth.uid(), 'receivable', '40000000-0000-0000-0000-000000000001', 2000000, 'VND');
insert into finance_transactions (user_id, account_id, occurred_on, amount_minor, currency, kind, debt_id, description) values
  (auth.uid(), '30000000-0000-0000-0000-000000000001', current_date, -2000000, 'VND', 'expense', '50000000-0000-0000-0000-000000000001', 'Lent to Minh'),
  (auth.uid(), '30000000-0000-0000-0000-000000000001', current_date,   500000, 'VND', 'income',  '50000000-0000-0000-0000-000000000001', 'Minh repaid part');
select record_transfer('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 1000000, current_date, 'ATM');
do $$ begin
  assert (select balance_minor from finance_account_balances where name = 'Techcombank') = 7500000, 'bank balance';
  assert (select balance_minor from finance_account_balances where name = 'Cash') = 1000000, 'cash balance';
  assert (select outstanding_minor from debt_balances) = 1500000, 'debt outstanding ignores disbursement';
  begin
    insert into finance_transactions (user_id, account_id, occurred_on, amount_minor, currency, kind)
    values (auth.uid(), '30000000-0000-0000-0000-000000000003', current_date, -100, 'VND', 'expense');
    raise exception 'currency mismatch allowed';
  exception when check_violation then null; end;
  begin
    insert into finance_transactions (user_id, account_id, occurred_on, amount_minor, currency, kind)
    values (auth.uid(), '30000000-0000-0000-0000-000000000002', current_date, 100, 'VND', 'expense');
    raise exception 'positive expense allowed';
  exception when check_violation then null; end;
end $$;

-- Romantic relationship must be SENSITIVE.
do $$ begin
  begin
    insert into relationships (user_id, person_id, kind) values (auth.uid(), '40000000-0000-0000-0000-000000000001', 'romantic');
    raise exception 'non-sensitive romantic relationship allowed';
  exception when check_violation then null; end;
end $$;

-- External reference hygiene on hard delete + calendar 1:1.
insert into calendar_events (id, user_id, title, starts_at, ends_at, task_id) values
  ('60000000-0000-0000-0000-000000000001', auth.uid(), 'Itinerary block', now(), now() + interval '1 hour',
   '20000000-0000-0000-0000-000000000001');
insert into integration_accounts (id, user_id, provider, external_account_id)
values ('70000000-0000-0000-0000-000000000001', auth.uid(), 'google', 'google-sub-123');
insert into external_references (user_id, entity_type, entity_id, provider, integration_account_id, external_type, external_id)
values (auth.uid(), 'calendar_event', '60000000-0000-0000-0000-000000000001', 'google', '70000000-0000-0000-0000-000000000001', 'calendar_event', 'gcal_abc');
do $$ begin
  begin
    insert into external_references (user_id, entity_type, entity_id, provider, external_type, external_id)
    values (auth.uid(), 'calendar_event', gen_random_uuid(), 'google', 'calendar_event', 'gcal_abc');
    raise exception 'duplicate calendar mapping allowed';
  exception when unique_violation then null; end;
end $$;
delete from calendar_events where id = '60000000-0000-0000-0000-000000000001';
do $$ begin
  assert (select count(*) from external_references) = 0, 'external refs cleaned on hard delete';
end $$;

-- Secrets are unreachable for the authenticated role.
do $$ begin
  begin
    perform 1 from integration_secrets;
    raise exception 'integration_secrets readable by authenticated';
  exception when insufficient_privilege then null; end;
  begin
    perform secret_hash from api_keys;
    raise exception 'api_keys.secret_hash readable by authenticated';
  exception when insufficient_privilege then null; end;
end $$;

-- Audit log is append-only.
insert into audit_logs (user_id, actor_type, actor_id, source, action, category, entity_type, entity_id, status)
values (auth.uid(), 'ai', null, 'mcp', 'task.complete', 'write', 'task', '20000000-0000-0000-0000-000000000001', 'success');
do $$ begin
  begin
    delete from audit_logs;
    raise exception 'audit delete allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- Timeline is derived.
do $$ begin
  assert (select count(*) from timeline_events where event_type = 'task.completed') = 1, 'timeline derives completions';
end $$;

-- RLS: a second user sees nothing of the owner's data.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin
  assert (select count(*) from projects) = 0, 'RLS hides projects';
  assert (select count(*) from tasks) = 0, 'RLS hides tasks';
  assert (select count(*) from finance_account_balances) = 0, 'RLS applies through views';
  assert (select count(*) from audit_logs) = 0, 'RLS hides audit';
  begin
    insert into tasks (user_id, title) values ('00000000-0000-0000-0000-000000000001', 'forged');
    raise exception 'cross-user insert allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- Anonymous role has no table access at all.
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from tasks;
    raise exception 'anon can read tasks';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
rollback;
\echo 'SMOKE TEST PASSED'
