-- =============================================================================
--  Personal OS — MVP v0 migration (first slice of Phase 1)
--  Derived from supabase/proposal/0000_proposed_schema.sql. Only what the MVP
--  slice uses: profiles, companies, projects, tasks, audit_logs.
--  Deferred to later Phase 1 migrations: people, task_dependencies, api_keys,
--  ai_actions, idempotency_keys (tasks.person_id is added with people).
-- =============================================================================

create extension if not exists citext;
create schema if not exists private;

create type data_classification as enum ('public', 'private', 'sensitive');
create type project_status      as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');
create type task_status         as enum ('backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type task_priority       as enum ('urgent', 'high', 'normal', 'low');
create type task_kind           as enum ('task', 'follow_up', 'milestone');
create type entity_type         as enum ('profile', 'company', 'project', 'task');
create type actor_type          as enum ('user', 'api_key', 'ai', 'system', 'integration');
create type action_source       as enum ('web', 'api', 'mcp', 'ai_command', 'webhook', 'system');
create type action_category     as enum ('read', 'write', 'delete', 'execute');
create type audit_status        as enum ('success', 'failure', 'denied', 'pending');

create function private.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create function private.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'insufficient_privilege';
end $$;

-- ---------------------------------------------------------------- profiles
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  timezone      text not null default 'Asia/Ho_Chi_Minh',
  locale        text not null default 'en',
  base_currency char(3) not null default 'VND' check (base_currency ~ '^[A-Z]{3}$'),
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------- companies
create table companies (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (length(name) between 1 and 200),
  domain         citext,
  website        text,
  industry       text,
  notes          text,
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz
);
create unique index companies_user_domain_uq on companies (user_id, domain)
  where domain is not null and deleted_at is null;
create index companies_user_name_idx on companies (user_id, name) where deleted_at is null;

-- ---------------------------------------------------------------- projects
create table projects (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  code           text not null check (code ~ '^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$' and length(code) <= 32),
  name           text not null check (length(name) between 1 and 200),
  description    text,
  status         project_status not null default 'active',
  company_id     uuid references companies(id) on delete set null,
  start_date     date,
  target_date    date,
  completed_at   timestamptz,
  next_task_seq  integer not null default 1 check (next_task_seq >= 1),
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz,
  constraint projects_user_code_uq unique (user_id, code),
  constraint projects_dates_chk check (target_date is null or start_date is null or target_date >= start_date),
  constraint projects_completed_chk check ((status = 'completed') = (completed_at is not null))
);
create index projects_user_status_idx on projects (user_id, status) where deleted_at is null and archived_at is null;
create index projects_company_idx on projects (company_id) where company_id is not null;

create function private.forbid_project_code_change() returns trigger
language plpgsql as $$
begin
  if new.code <> old.code then
    raise exception 'project code is immutable (%)', old.code using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger projects_code_immutable before update of code on projects
  for each row execute function private.forbid_project_code_change();

-- ---------------------------------------------------------------- tasks
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  project_id       uuid references projects(id) on delete restrict,
  seq              integer,
  code             text,
  previous_codes   text[] not null default '{}',
  title            text not null check (length(title) between 1 and 500),
  description      text,
  status           task_status not null default 'todo',
  priority         task_priority not null default 'normal',
  kind             task_kind not null default 'task',
  due_on           date,
  completed_at     timestamptz,
  estimate_minutes integer check (estimate_minutes > 0),
  company_id       uuid references companies(id) on delete set null,
  classification   data_classification not null default 'private',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz,
  deleted_at       timestamptz,
  constraint tasks_user_code_uq unique (user_id, code),
  constraint tasks_code_needs_project_chk check (code is null or project_id is not null),
  constraint tasks_done_chk check ((status = 'done') = (completed_at is not null)),
  -- MVP: follow-ups target a company (people arrive in a later migration; then: person_id or company_id)
  constraint tasks_follow_up_target_chk check (kind <> 'follow_up' or company_id is not null)
);
create index tasks_user_open_due_idx on tasks (user_id, due_on)
  where deleted_at is null and status not in ('done', 'cancelled');
create index tasks_project_status_idx on tasks (project_id, status) where deleted_at is null;
create index tasks_previous_codes_gin on tasks using gin (previous_codes);

-- {project.code}-T{NN}, assigned atomically on insert and on move (ADR-006: re-code on move).
create function private.assign_task_code() returns trigger
language plpgsql as $$
declare
  v_seq  integer;
  v_code text;
begin
  if new.project_id is null then
    if tg_op = 'UPDATE' and old.project_id is not null then
      raise exception 'a task with a code cannot be moved back to the inbox' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.project_id is not distinct from old.project_id then
    new.seq := old.seq; new.code := old.code;
    return new;
  end if;
  update public.projects
     set next_task_seq = next_task_seq + 1
   where id = new.project_id and user_id = new.user_id
  returning next_task_seq - 1, code into v_seq, v_code;
  if v_seq is null then
    raise exception 'project % not found for this user', new.project_id using errcode = 'foreign_key_violation';
  end if;
  if tg_op = 'UPDATE' and old.code is not null then
    new.previous_codes := array_append(old.previous_codes, old.code);
  end if;
  new.seq  := v_seq;
  new.code := v_code || '-T' || lpad(v_seq::text, 2, '0');
  return new;
end $$;
create trigger tasks_assign_code_ins before insert on tasks
  for each row execute function private.assign_task_code();
create trigger tasks_assign_code_upd before update of project_id, code, seq on tasks
  for each row execute function private.assign_task_code();

-- ---------------------------------------------------------------- audit_logs (activity feed)
create table audit_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  actor_type   actor_type not null,
  actor_id     uuid,
  source       action_source not null,
  action       text not null check (action ~ '^[a-z_]+\.[a-z_]+(\.[a-z_]+)?$'),
  category     action_category not null,
  entity_type  entity_type,
  entity_id    uuid,
  status       audit_status not null,
  input        jsonb,
  result       jsonb,
  error_code   text,
  request_id   text,
  ip           inet,
  user_agent   text
);
create index audit_logs_user_time_idx on audit_logs (user_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc) where entity_id is not null;
create trigger audit_logs_append_only before update or delete on audit_logs
  for each row execute function private.forbid_mutation();

-- ---------------------------------------------------------------- updated_at
create trigger profiles_set_updated_at  before update on profiles  for each row execute function private.set_updated_at();
create trigger companies_set_updated_at before update on companies for each row execute function private.set_updated_at();
create trigger projects_set_updated_at  before update on projects  for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at     before update on tasks     for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['companies', 'projects', 'tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format($p$create policy owner_all on public.%I for all to authenticated
                      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table profiles enable row level security;
revoke all on profiles from anon;
grant select, update on profiles to authenticated;
create policy profiles_owner_select on profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_owner_update on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table audit_logs enable row level security;
revoke all on audit_logs from anon;
grant select, insert on audit_logs to authenticated;
create policy audit_owner_select on audit_logs for select to authenticated using (user_id = (select auth.uid()));
create policy audit_owner_insert on audit_logs for insert to authenticated with check (user_id = (select auth.uid()));

-- ADR-017: tokens from Supabase's OAuth 2.1 server (client_id claim) never use the Data API directly.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'companies', 'projects', 'tasks', 'audit_logs'] loop
    execute format($p$create policy no_oauth_client_tokens on public.%I as restrictive for all to authenticated
                      using ((select auth.jwt()) ->> 'client_id' is null)
                      with check ((select auth.jwt()) ->> 'client_id' is null)$p$, t);
  end loop;
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
