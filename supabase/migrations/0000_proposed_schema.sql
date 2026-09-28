-- =============================================================================
--  PERSONAL OS — PROPOSED SCHEMA (PHASE 0)                     *** PROPOSAL ***
-- =============================================================================
--  STATUS: PROPOSAL FOR REVIEW. NOT AN APPLIED MIGRATION. DO NOT `supabase db push`.
--  After Founder approval this file is split into real, phase-scoped migrations
--  (Phase 1 ships only: profiles, companies, people (minimal, for task FKs), projects,
--  tasks, task_dependencies, api_keys, ai_actions, audit_logs, idempotency_keys).
--  See docs/schema.md.
--  Accepted 2026-09-29: ADR-003 (supabase-js, no ORM), ADR-012 (confirmation flow +
--  small-expense rule), ADR-013 (personal Gmail, OAuth Testing mode), ADR-015 (cuts/merges),
--  ADR-017 (MCP: Cursor via API key, ChatGPT via Supabase OAuth 2.1 grants -> api_keys.kind).
--  ADR-004/005/008/010/011/016/018/019/020/021 accepted by the Technical Director.
--
--  Conventions
--  * Every row carries user_id -> auth.users (single owner today; RLS-ready).
--  * id uuid default gen_random_uuid(); created_at/updated_at timestamptz UTC.
--  * archived_at = hidden from active views, still history.
--    deleted_at  = trash (soft delete); hard purge is an explicit later job.
--  * Money = bigint minor units + ISO-4217 currency. No floats. No stored balances.
--  * Derived data (balances, outstanding debt, delivery status, timeline) = views.
--  * Core-entity -> external-object links live ONLY in external_references.
--  * Validated with: psql -v ON_ERROR_STOP=1 (see scripts/validate-schema.sh).
-- =============================================================================

begin;

create extension if not exists citext;

-- Helper functions live in a schema NOT exposed through the Supabase Data API.
create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Enums (lowercase values; docs refer to them as PUBLIC/PRIVATE/SENSITIVE etc.)
-- -----------------------------------------------------------------------------
create type data_classification  as enum ('public', 'private', 'sensitive');
create type project_status       as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');
create type task_status          as enum ('backlog', 'todo', 'in_progress', 'blocked', 'done', 'cancelled');
create type task_priority        as enum ('urgent', 'high', 'normal', 'low');  -- declared order = sort order
create type task_kind            as enum ('task', 'follow_up', 'milestone');
create type calendar_event_status as enum ('confirmed', 'tentative', 'cancelled');
create type calendar_event_kind  as enum ('event', 'meeting', 'time_block', 'appointment', 'routine');
create type finance_account_type as enum ('cash', 'bank', 'credit_card', 'e_wallet', 'investment', 'loan', 'other');
create type transaction_kind     as enum ('income', 'expense', 'transfer', 'adjustment');
create type debt_direction       as enum ('payable', 'receivable');     -- payable = I owe; receivable = owed to me
create type debt_status          as enum ('open', 'settled', 'written_off');
create type goal_status          as enum ('active', 'achieved', 'abandoned');
create type relationship_kind    as enum ('family', 'friend', 'romantic', 'professional', 'client', 'acquaintance', 'other');
create type interaction_channel  as enum ('in_person', 'call', 'video', 'message', 'email', 'social', 'other');
create type important_date_kind  as enum ('birthday', 'anniversary', 'memorial', 'custom');
create type note_kind            as enum ('note', 'research', 'bookmark', 'document');
create type memory_category      as enum ('preference', 'fact', 'person_context', 'goal', 'historical_context', 'life_event');
create type memory_source        as enum ('user', 'ai', 'integration', 'import');
create type lead_status          as enum ('new', 'contacted', 'replied', 'qualified', 'won', 'lost', 'do_not_contact');
create type campaign_status      as enum ('draft', 'active', 'paused', 'completed');
create type enrollment_status    as enum ('active', 'paused', 'completed', 'replied', 'bounced', 'unsubscribed', 'stopped');
create type email_provider       as enum ('gmail', 'resend');
create type email_message_status as enum ('draft', 'queued', 'sent', 'failed', 'cancelled');
create type email_event_type     as enum ('sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed');
create type integration_provider as enum ('google', 'notion', 'github', 'resend');
create type integration_status   as enum ('active', 'expired', 'revoked', 'error', 'disconnected');
create type external_object_type as enum (
  'calendar_event', 'gmail_message', 'gmail_thread', 'notion_page', 'notion_database',
  'github_repo', 'github_issue', 'github_pr', 'github_commit', 'github_deployment');
create type sync_status          as enum ('linked', 'synced', 'pending_push', 'conflict', 'error', 'deleted_remote');
create type entity_type          as enum (
  'profile', 'company', 'project', 'task', 'calendar_event', 'finance_account', 'finance_transaction',
  'debt', 'financial_goal', 'person', 'relationship', 'interaction', 'important_date', 'note',
  'memory', 'lead', 'email_campaign', 'email_message', 'integration_account', 'api_key', 'ai_action');
create type actor_type           as enum ('user', 'api_key', 'ai', 'system', 'integration');
create type action_source        as enum ('web', 'api', 'mcp', 'ai_command', 'webhook', 'system');
create type action_category      as enum ('read', 'write', 'delete', 'execute');
create type audit_status         as enum ('success', 'failure', 'denied', 'pending');
create type ai_action_status     as enum ('pending_confirmation', 'confirmed', 'rejected', 'expired',
                                          'executing', 'succeeded', 'failed', 'denied');
create type webhook_status       as enum ('received', 'processed', 'ignored', 'failed');
create type credential_kind      as enum ('api_key', 'oauth_grant');   -- ADR-017

-- -----------------------------------------------------------------------------
-- Generic trigger functions
-- -----------------------------------------------------------------------------
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

-- Removes external links when a core row is HARD deleted (polymorphic FK hygiene).
-- tg_argv[0] = entity_type value.
create function private.delete_external_references() returns trigger
language plpgsql as $$
begin
  delete from public.external_references
   where entity_type = tg_argv[0]::public.entity_type and entity_id = old.id;
  return old;
end $$;

-- =============================================================================
-- CORE / PERSONAL
-- =============================================================================
-- `users` table CUT: auth.users is the identity; profiles is 1:1 app data.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  timezone      text not null default 'Asia/Ho_Chi_Minh',  -- defines "today"
  locale        text not null default 'en',
  base_currency char(3) not null default 'VND' check (base_currency ~ '^[A-Z]{3}$'),
  settings      jsonb not null default '{}'::jsonb,        -- UI prefs only; personal prefs = memories
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

-- =============================================================================
-- WORK
-- =============================================================================
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
  next_task_seq  integer not null default 1 check (next_task_seq >= 1),  -- code allocator, not business data
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz,
  -- codes are never reused, even after delete: old references must stay unambiguous
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

-- people is defined before tasks because tasks reference it.
create table people (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  display_name     text not null check (length(display_name) between 1 and 200),
  given_name       text,
  family_name      text,
  nickname         text,
  emails           citext[] not null default '{}',
  phones           text[] not null default '{}',
  company_id       uuid references companies(id) on delete set null,
  job_title        text,
  location         text,
  notes            text,
  email_opt_out_at timestamptz,  -- suppression: never send outreach once set
  classification   data_classification not null default 'private',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz,
  deleted_at       timestamptz
);
create index people_user_name_idx on people (user_id, display_name) where deleted_at is null;
create index people_emails_gin on people using gin (emails);
create index people_company_idx on people (company_id) where company_id is not null;

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  project_id       uuid references projects(id) on delete restrict,
  seq              integer,             -- per-project sequence, assigned by trigger
  code             text,                -- e.g. HOWL-VTO-01-T01; null while in inbox
  previous_codes   text[] not null default '{}',  -- codes held before a project move
  title            text not null check (length(title) between 1 and 500),
  description      text,
  status           task_status not null default 'todo',
  priority         task_priority not null default 'normal',
  kind             task_kind not null default 'task',
  due_on           date,                -- date-only; exact times belong to calendar_events
  completed_at     timestamptz,
  estimate_minutes integer check (estimate_minutes > 0),
  person_id        uuid references people(id) on delete set null,
  company_id       uuid references companies(id) on delete set null,
  classification   data_classification not null default 'private',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz,
  deleted_at       timestamptz,
  constraint tasks_user_code_uq unique (user_id, code),
  constraint tasks_code_needs_project_chk check (code is null or project_id is not null),
  constraint tasks_done_chk check ((status = 'done') = (completed_at is not null)),
  constraint tasks_follow_up_target_chk check (kind <> 'follow_up' or person_id is not null or company_id is not null)
);
create index tasks_user_open_due_idx on tasks (user_id, due_on)
  where deleted_at is null and status not in ('done', 'cancelled');
create index tasks_project_status_idx on tasks (project_id, status) where deleted_at is null;
create index tasks_person_idx on tasks (person_id) where person_id is not null;
create index tasks_previous_codes_gin on tasks using gin (previous_codes);

-- Assigns {project.code}-T{NN} atomically (row lock on the project) on insert
-- and on move to another project. Old code is kept in previous_codes.
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
    new.seq := old.seq; new.code := old.code;   -- code is immutable otherwise
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

create table task_dependencies (
  task_id            uuid not null references tasks(id) on delete cascade,
  depends_on_task_id uuid not null references tasks(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_no_self_chk check (task_id <> depends_on_task_id)
);
create index task_dependencies_depends_on_idx on task_dependencies (depends_on_task_id);

create function private.prevent_dependency_cycle() returns trigger
language plpgsql as $$
begin
  if exists (
    with recursive chain(id) as (
      select new.depends_on_task_id
      union
      select d.depends_on_task_id from public.task_dependencies d join chain c on d.task_id = c.id
    )
    select 1 from chain where id = new.task_id
  ) then
    raise exception 'dependency cycle detected' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger task_dependencies_no_cycle before insert or update on task_dependencies
  for each row execute function private.prevent_dependency_cycle();

-- =============================================================================
-- TIME
-- =============================================================================
create table calendar_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null check (length(title) between 1 and 500),
  description    text,
  location       text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  all_day        boolean not null default false,
  timezone       text not null default 'Asia/Ho_Chi_Minh',
  status         calendar_event_status not null default 'confirmed',
  kind           calendar_event_kind not null default 'event',
  task_id        uuid references tasks(id) on delete set null,     -- Project -> Task -> Calendar Event
  project_id     uuid references projects(id) on delete set null,
  attendees      jsonb not null default '[]'::jsonb,               -- snapshot [{email,name,response}]
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz,
  constraint calendar_events_range_chk check (ends_at >= starts_at),
  constraint calendar_events_attendees_chk check (jsonb_typeof(attendees) = 'array')
);
create index calendar_events_user_range_idx on calendar_events (user_id, starts_at, ends_at) where deleted_at is null;
create index calendar_events_task_idx on calendar_events (task_id) where task_id is not null;

-- =============================================================================
-- FINANCE (all finance data is SENSITIVE by domain rule; no per-row column)
-- =============================================================================
-- Renamed accounts -> finance_accounts (avoids clash with integration/auth "accounts").
create table finance_accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (length(name) between 1 and 120),
  type                  finance_account_type not null,
  currency              char(3) not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance_minor bigint not null default 0,
  opened_on             date,
  institution           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  archived_at           timestamptz,
  deleted_at            timestamptz
);
create unique index finance_accounts_user_name_uq on finance_accounts (user_id, name) where deleted_at is null;

-- debts + receivables MERGED: same shape, direction enum.
create table debts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  direction         debt_direction not null,
  person_id         uuid references people(id) on delete set null,
  company_id        uuid references companies(id) on delete set null,
  counterparty_name text,
  principal_minor   bigint not null check (principal_minor > 0),
  currency          char(3) not null check (currency ~ '^[A-Z]{3}$'),
  opened_on         date not null default current_date,
  due_on            date,
  status            debt_status not null default 'open',
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  deleted_at        timestamptz,
  constraint debts_counterparty_chk check (person_id is not null or company_id is not null or counterparty_name is not null)
);
create index debts_user_open_idx on debts (user_id, direction) where status = 'open' and deleted_at is null;

create table financial_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (length(name) between 1 and 200),
  target_minor bigint not null check (target_minor > 0),
  currency     char(3) not null check (currency ~ '^[A-Z]{3}$'),
  target_date  date,
  account_id   uuid references finance_accounts(id) on delete set null,  -- progress = this account's balance
  status       goal_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  deleted_at   timestamptz
);

create table finance_transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  account_id        uuid not null references finance_accounts(id) on delete restrict,
  occurred_on       date not null,
  amount_minor      bigint not null check (amount_minor <> 0),  -- signed: + inflow, - outflow
  currency          char(3) not null check (currency ~ '^[A-Z]{3}$'),
  kind              transaction_kind not null,
  category          text,                                      -- free text v1; categories table later
  description       text,
  counterparty      text,
  person_id         uuid references people(id) on delete set null,
  company_id        uuid references companies(id) on delete set null,
  debt_id           uuid references debts(id) on delete restrict,
  transfer_group_id uuid,                                      -- both legs of a transfer share this
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint finance_tx_sign_chk check (
    (kind = 'income'  and amount_minor > 0) or
    (kind = 'expense' and amount_minor < 0) or
    kind in ('transfer', 'adjustment')),
  constraint finance_tx_transfer_chk check ((kind = 'transfer') = (transfer_group_id is not null))
);
create index finance_tx_account_date_idx on finance_transactions (account_id, occurred_on) where deleted_at is null;
create index finance_tx_user_date_idx on finance_transactions (user_id, occurred_on desc) where deleted_at is null;
create index finance_tx_debt_idx on finance_transactions (debt_id) where debt_id is not null;
create index finance_tx_transfer_idx on finance_transactions (transfer_group_id) where transfer_group_id is not null;

create function private.check_transaction_currency() returns trigger
language plpgsql as $$
begin
  if new.currency <> (select currency from public.finance_accounts where id = new.account_id) then
    raise exception 'transaction currency % does not match account currency', new.currency
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger finance_tx_currency before insert or update of currency, account_id on finance_transactions
  for each row execute function private.check_transaction_currency();

-- Atomic transfer (supabase-js has no client transactions; this is the RPC pattern).
create function public.record_transfer(
  p_from_account uuid, p_to_account uuid, p_amount_minor bigint, p_occurred_on date, p_description text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_group uuid := gen_random_uuid();
  v_user  uuid;
  v_from  char(3);
  v_to    char(3);
begin
  if p_amount_minor <= 0 then raise exception 'amount must be positive' using errcode = 'check_violation'; end if;
  select user_id, currency into v_user, v_from from public.finance_accounts where id = p_from_account;
  select currency into v_to from public.finance_accounts where id = p_to_account and user_id = v_user;
  if v_from is null or v_to is null then raise exception 'account not found' using errcode = 'foreign_key_violation'; end if;
  if v_from <> v_to then raise exception 'cross-currency transfers are not supported in v1' using errcode = 'check_violation'; end if;
  insert into public.finance_transactions (user_id, account_id, occurred_on, amount_minor, currency, kind, description, transfer_group_id)
  values (v_user, p_from_account, p_occurred_on, -p_amount_minor, v_from, 'transfer', p_description, v_group),
         (v_user, p_to_account,   p_occurred_on,  p_amount_minor, v_to,   'transfer', p_description, v_group);
  return v_group;
end $$;

-- =============================================================================
-- RELATIONSHIPS
-- =============================================================================
-- relationships = owner <-> person (not person <-> person in v1). A person may have several kinds.
create table relationships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_id      uuid not null references people(id) on delete cascade,
  kind           relationship_kind not null,
  label          text,                                  -- 'sister', 'co-founder', ...
  closeness      smallint check (closeness between 1 and 5),
  since          date,
  ended_on       date,
  notes          text,
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz,
  constraint relationships_romantic_sensitive_chk check (kind <> 'romantic' or classification = 'sensitive'),
  constraint relationships_dates_chk check (ended_on is null or since is null or ended_on >= since)
);
create unique index relationships_person_kind_uq on relationships (person_id, kind) where deleted_at is null;

create table interactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  person_id         uuid not null references people(id) on delete cascade,
  occurred_at       timestamptz not null,
  channel           interaction_channel not null,
  summary           text not null check (length(summary) between 1 and 2000),
  notes             text,
  calendar_event_id uuid references calendar_events(id) on delete set null,
  email_message_id  uuid,  -- FK added after email_messages
  classification    data_classification not null default 'private',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index interactions_person_time_idx on interactions (person_id, occurred_at desc) where deleted_at is null;
create index interactions_user_time_idx on interactions (user_id, occurred_at desc) where deleted_at is null;

create table important_dates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  person_id          uuid references people(id) on delete cascade,  -- null = the owner's own date
  kind               important_date_kind not null,
  label              text,
  month              smallint not null check (month between 1 and 12),
  day                smallint not null check (day between 1 and 31),
  year               smallint check (year between 1900 and 2200),    -- null when unknown
  remind_days_before smallint not null default 7 check (remind_days_before between 0 and 365),
  classification     data_classification not null default 'private',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  constraint important_dates_valid_day_chk check (
    day <= case when month = 2 then 29 when month in (4, 6, 9, 11) then 30 else 31 end),
  constraint important_dates_custom_label_chk check (kind <> 'custom' or label is not null)
);
create index important_dates_user_month_day_idx on important_dates (user_id, month, day) where deleted_at is null;

-- =============================================================================
-- KNOWLEDGE & MEMORY
-- =============================================================================
create table notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  kind           note_kind not null default 'note',
  title          text not null check (length(title) between 1 and 500),
  body           text not null default '',              -- markdown
  source_url     text,
  tags           text[] not null default '{}',
  project_id     uuid references projects(id) on delete set null,
  person_id      uuid references people(id) on delete set null,
  classification data_classification not null default 'private',
  search         tsvector generated always as (
                   setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                   setweight(to_tsvector('simple', coalesce(body, '')), 'B')) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  deleted_at     timestamptz
);
create index notes_search_gin on notes using gin (search);
create index notes_tags_gin on notes using gin (tags);
create index notes_user_updated_idx on notes (user_id, updated_at desc) where deleted_at is null;

create table memories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_id      uuid references people(id) on delete cascade,
  category       memory_category not null,
  content        text not null check (length(content) between 1 and 4000),
  importance     smallint not null default 3 check (importance between 1 and 5),
  confidence     numeric(3, 2) not null default 1.00 check (confidence between 0 and 1),
  source         memory_source not null,
  source_ref     text,                                   -- e.g. ai_action id, note id, URL
  valid_from     timestamptz not null default now(),
  valid_until    timestamptz,                            -- null = currently valid
  supersedes_id  uuid references memories(id) on delete set null,  -- correction chain
  classification data_classification not null default 'private',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint memories_validity_chk check (valid_until is null or valid_until > valid_from)
);
create index memories_current_idx on memories (user_id, category) where valid_until is null and deleted_at is null;
create index memories_person_idx on memories (person_id) where person_id is not null;

-- =============================================================================
-- COMMUNICATION (Phase 4). contacts CUT -> people. follow_ups CUT -> tasks(kind=follow_up)
-- + email_sequence_steps for automated follow-ups.
-- =============================================================================
create table leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  person_id   uuid references people(id) on delete restrict,
  company_id  uuid references companies(id) on delete restrict,
  status      lead_status not null default 'new',
  source      text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at  timestamptz,
  constraint leads_target_chk check (person_id is not null or company_id is not null)
);
create unique index leads_person_uq on leads (user_id, person_id) where person_id is not null and deleted_at is null;
create index leads_user_status_idx on leads (user_id, status) where deleted_at is null;

create table email_campaigns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 200),
  status      campaign_status not null default 'draft',
  from_email  citext not null,
  from_name   text,
  reply_to    citext,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at  timestamptz
);

create table email_sequence_steps (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  campaign_id      uuid not null references email_campaigns(id) on delete cascade,
  step_number      smallint not null check (step_number >= 1),
  delay_days       smallint not null default 0 check (delay_days between 0 and 365),
  subject_template text not null,
  body_template    text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint email_sequence_steps_order_uq unique (campaign_id, step_number)
);

create table campaign_enrollments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  campaign_id    uuid not null references email_campaigns(id) on delete cascade,
  lead_id        uuid not null references leads(id) on delete cascade,
  status         enrollment_status not null default 'active',
  current_step   smallint not null default 0 check (current_step >= 0),  -- last step sent
  next_send_at   timestamptz,
  stopped_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint campaign_enrollments_uq unique (campaign_id, lead_id)
);
create index campaign_enrollments_due_idx on campaign_enrollments (next_send_at) where status = 'active';

-- OS-originated outbound mail only (Resend sends, Gmail drafts/sends made by the OS).
-- The Gmail inbox is NOT mirrored; it is queried live through the adapter.
create table email_messages (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  provider               email_provider not null,
  status                 email_message_status not null default 'draft',
  from_email             citext not null,
  to_emails              citext[] not null check (cardinality(to_emails) >= 1),
  cc_emails              citext[] not null default '{}',
  bcc_emails             citext[] not null default '{}',
  subject                text not null,
  body_text              text,
  body_html              text,
  person_id              uuid references people(id) on delete set null,
  lead_id                uuid references leads(id) on delete set null,
  enrollment_id          uuid references campaign_enrollments(id) on delete set null,
  sequence_step_id       uuid references email_sequence_steps(id) on delete set null,
  integration_account_id uuid,   -- FK added after integration_accounts (gmail account used)
  provider_message_id    text,   -- intrinsic delivery id (Resend id / Gmail message id)
  provider_thread_id     text,
  scheduled_at           timestamptz,
  sent_at                timestamptz,
  error                  text,
  classification         data_classification not null default 'private',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  constraint email_messages_sent_chk check ((status = 'sent') = (sent_at is not null)),
  constraint email_messages_body_chk check (body_text is not null or body_html is not null)
);
create unique index email_messages_provider_id_uq on email_messages (provider, provider_message_id)
  where provider_message_id is not null;
create index email_messages_user_created_idx on email_messages (user_id, created_at desc) where deleted_at is null;
create index email_messages_person_idx on email_messages (person_id) where person_id is not null;

alter table interactions add constraint interactions_email_message_fk
  foreign key (email_message_id) references email_messages(id) on delete set null;

create table email_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  email_message_id  uuid not null references email_messages(id) on delete cascade,
  provider          email_provider not null,
  type              email_event_type not null,
  occurred_at       timestamptz not null,
  provider_event_id text not null,                      -- idempotency key from webhook
  payload           jsonb not null default '{}'::jsonb, -- redacted
  created_at        timestamptz not null default now(),
  constraint email_events_idem_uq unique (provider, provider_event_id)
);
create index email_events_message_time_idx on email_events (email_message_id, occurred_at desc);

-- =============================================================================
-- INTEGRATIONS. `integrations` table CUT -> provider catalog in code.
-- =============================================================================
create table integration_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  provider            integration_provider not null,
  external_account_id text not null,        -- google sub, notion workspace id, github user id
  display_name        text,                 -- e.g. the Google account email
  status              integration_status not null default 'active',
  scopes              text[] not null default '{}',   -- scopes actually granted by provider
  token_expires_at    timestamptz,          -- access token expiry
  refresh_token_expires_at timestamptz,     -- Google OAuth app in Testing mode: consent + 7 days (ADR-013); null = no known expiry
  sync_state          jsonb not null default '{}'::jsonb,  -- e.g. {"calendar:primary":{"sync_token":"..."}}
  metadata            jsonb not null default '{}'::jsonb,
  last_synced_at      timestamptz,
  last_error          text,
  connected_at        timestamptz not null default now(),
  revoked_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint integration_accounts_uq unique (user_id, provider, external_account_id)
);

-- Encrypted credentials, split out so no user-facing policy can ever read them.
-- AES-256-GCM in the app (key in env, never in DB). Service role only: RLS on, zero policies.
create table integration_secrets (
  integration_account_id  uuid primary key references integration_accounts(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  access_token_encrypted  text,              -- base64(iv || ciphertext || tag)
  refresh_token_encrypted text,
  key_version             smallint not null default 1,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table email_messages add constraint email_messages_integration_account_fk
  foreign key (integration_account_id) references integration_accounts(id) on delete set null;

create table external_references (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  entity_type            entity_type not null,
  entity_id              uuid not null,   -- polymorphic; hygiene via delete triggers below
  provider               integration_provider not null,
  integration_account_id uuid references integration_accounts(id) on delete set null,
  external_type          external_object_type not null,
  external_id            text not null check (length(external_id) between 1 and 512),
  external_url           text,
  etag                   text,
  sync_status            sync_status not null default 'linked',
  remote_updated_at      timestamptz,
  last_synced_at         timestamptz,
  metadata               jsonb not null default '{}'::jsonb,  -- small synced subset (title, state), never a mirror
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint external_references_link_uq unique (user_id, provider, external_type, external_id, entity_type, entity_id)
);
create index external_references_entity_idx on external_references (entity_type, entity_id);
-- one OS event per remote calendar event (sync correctness)
create unique index external_references_calendar_1to1_uq on external_references (user_id, provider, external_id)
  where external_type = 'calendar_event';

-- =============================================================================
-- PLATFORM: API keys, AI actions, audit, idempotency, webhooks
-- =============================================================================
-- Credentials of non-session actors. kind='api_key': our pk_ secret (Cursor, scripts).
-- kind='oauth_grant': created when the owner approves an MCP OAuth client (ChatGPT) on the
-- consent page; tokens are issued by Supabase Auth's OAuth 2.1 server and carry `client_id`,
-- which the MCP endpoint maps to this row for scopes, revocation and audit (actor_id = id).
create table api_keys (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references auth.users(id) on delete cascade,
  kind                         credential_kind not null default 'api_key',
  name                         text not null check (length(name) between 1 and 100),
  environment                  text not null default 'live' check (environment in ('live', 'test')),
  prefix                       text,                      -- api_key only: display, e.g. 'pk_live_7Hk2'
  secret_hash                  bytea,                     -- api_key only: sha256(full key); 256-bit entropy
  oauth_client_id              text,                      -- oauth_grant only: Supabase OAuth client_id
  scopes                       text[] not null check (cardinality(scopes) >= 1),
  sensitive_scopes_approved_at timestamptz,               -- set when owner re-authenticated to grant sensitive scopes
  created_at                   timestamptz not null default now(),
  expires_at                   timestamptz,
  last_used_at                 timestamptz,
  revoked_at                   timestamptz,
  constraint api_keys_hash_uq unique (secret_hash),
  constraint api_keys_expiry_chk check (expires_at is null or expires_at > created_at),
  constraint api_keys_kind_chk check (
    (kind = 'api_key'     and secret_hash is not null and prefix is not null and oauth_client_id is null) or
    (kind = 'oauth_grant' and oauth_client_id is not null and secret_hash is null and prefix is null))
);
create index api_keys_user_active_idx on api_keys (user_id) where revoked_at is null;
create unique index api_keys_active_oauth_client_uq on api_keys (user_id, oauth_client_id)
  where kind = 'oauth_grant' and revoked_at is null;

-- One row per agent tool invocation (AI/MCP) or confirmation-gated API-key request.
create table ai_actions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  actor_type              actor_type not null check (actor_type in ('ai', 'api_key')),
  api_key_id              uuid references api_keys(id) on delete set null,
  client                  text,                -- 'cursor-mcp' (first, ADR-017), 'chatgpt-mcp', later 'claude-mcp', 'command-center'
  tool_name               text not null,       -- 'send_email'
  operation               text not null,       -- permission registry id, 'gmail.send'
  category                action_category not null,
  status                  ai_action_status not null,
  input                   jsonb not null default '{}'::jsonb,  -- validated, redacted args (executed verbatim on confirm)
  input_hash              text not null,                        -- sha256 of canonical input
  result                  jsonb,
  error                   text,
  requires_confirmation   boolean not null default false,
  confirmation_expires_at timestamptz,
  -- Set when a normally gated operation ran without confirmation under an explicit rule, e.g.
  -- 'finance.small_expense_vnd_lt_50000' (ADR-012: VND expense strictly below 50,000). The rule itself
  -- (threshold, predicate) lives in code; this column makes every waiver auditable and reversible.
  auto_approval_rule      text check (auto_approval_rule ~ '^[a-z0-9_.]+$'),
  confirmed_at            timestamptz,
  rejected_at             timestamptz,
  executed_at             timestamptz,
  entity_type             entity_type,
  entity_id               uuid,
  request_id              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ai_actions_confirmation_chk check (
    not requires_confirmation or confirmation_expires_at is not null),
  constraint ai_actions_auto_approval_chk check (
    auto_approval_rule is null or not requires_confirmation)
);
create index ai_actions_auto_approved_idx on ai_actions (user_id, created_at desc) where auto_approval_rule is not null;
create index ai_actions_user_created_idx on ai_actions (user_id, created_at desc);
create index ai_actions_pending_idx on ai_actions (user_id, confirmation_expires_at) where status = 'pending_confirmation';

-- Append-only log for ALL actors. Answers "what did Ivan/AI do today?".
create table audit_logs (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  actor_type   actor_type not null,
  actor_id     uuid,                 -- user id | api_key id | null (system)
  source       action_source not null,
  action       text not null check (action ~ '^[a-z_]+\.[a-z_]+(\.[a-z_]+)?$'),  -- 'task.complete'
  category     action_category not null,
  entity_type  entity_type,
  entity_id    uuid,
  status       audit_status not null,
  input        jsonb,                -- redacted; never tokens/secrets
  result       jsonb,
  error_code   text,
  request_id   text,
  ai_action_id uuid references ai_actions(id) on delete set null,
  ip           inet,
  user_agent   text
);
create index audit_logs_user_time_idx on audit_logs (user_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id, created_at desc) where entity_id is not null;
create index audit_logs_actor_time_idx on audit_logs (actor_type, actor_id, created_at desc);
create trigger audit_logs_append_only before update or delete on audit_logs
  for each row execute function private.forbid_mutation();

create table idempotency_keys (
  user_id         uuid not null references auth.users(id) on delete cascade,
  key             text not null check (length(key) between 8 and 255),
  request_method  text not null,
  request_path    text not null,
  request_hash    text not null,
  response_status smallint,
  response_body   jsonb,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  primary key (user_id, key)
);

create table webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,  -- resolved after routing
  provider     integration_provider not null,
  delivery_id  text not null,           -- svix-id / X-GitHub-Delivery / channel+message number
  event_type   text,
  status       webhook_status not null default 'received',
  attempts     integer not null default 1,
  payload      jsonb,                   -- redacted
  error        text,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  constraint webhook_deliveries_idem_uq unique (provider, delivery_id)
);

-- =============================================================================
-- DERIVED VIEWS (security_invoker so RLS of the caller applies)
-- =============================================================================
create view finance_account_balances with (security_invoker = true) as
select a.id as account_id, a.user_id, a.name, a.currency,
       a.opening_balance_minor + coalesce(sum(t.amount_minor) filter (where t.deleted_at is null), 0) as balance_minor
  from finance_accounts a
  left join finance_transactions t on t.account_id = a.id
 where a.deleted_at is null
 group by a.id;

-- Only repayments reduce outstanding: inflows for receivables, outflows for payables.
create view debt_balances with (security_invoker = true) as
select d.id as debt_id, d.user_id, d.direction, d.currency, d.principal_minor,
       d.principal_minor - coalesce(sum(case
         when d.direction = 'receivable' and t.amount_minor > 0 then t.amount_minor
         when d.direction = 'payable'    and t.amount_minor < 0 then -t.amount_minor
         else 0 end) filter (where t.deleted_at is null), 0) as outstanding_minor
  from debts d
  left join finance_transactions t on t.debt_id = d.id
 where d.deleted_at is null
 group by d.id;

create view email_message_delivery with (security_invoker = true) as
select distinct on (e.email_message_id) e.email_message_id, e.user_id, e.type as last_event, e.occurred_at
  from email_events e
 order by e.email_message_id, e.occurred_at desc;

-- Life timeline: derived, never hand-maintained (spec §27).
create view timeline_events with (security_invoker = true) as
select user_id, created_at as occurred_at, 'work'::text as domain, 'project.created'::text as event_type,
       'project'::entity_type as entity_type, id as entity_id, name as title, classification
  from projects where deleted_at is null
union all
select user_id, completed_at, 'work', 'task.completed', 'task', id, title, classification
  from tasks where completed_at is not null and deleted_at is null
union all
select user_id, occurred_on::timestamptz, 'finance', 'payment.received', 'finance_transaction', id,
       coalesce(description, counterparty, 'Income'), 'sensitive'::data_classification
  from finance_transactions where kind = 'income' and deleted_at is null
union all
select user_id, starts_at, 'time', 'meeting.held', 'calendar_event', id, title, classification
  from calendar_events where kind = 'meeting' and status <> 'cancelled' and deleted_at is null
union all
select user_id, occurred_at, 'relationships', 'interaction.logged', 'interaction', id, summary, classification
  from interactions where deleted_at is null
union all
select user_id, valid_from, 'personal', 'life_event', 'memory', id, left(content, 200), classification
  from memories where category = 'life_event' and deleted_at is null;

-- =============================================================================
-- updated_at triggers + external reference hygiene
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','projects','people','tasks','calendar_events','finance_accounts','debts',
    'financial_goals','finance_transactions','relationships','interactions','important_dates','notes',
    'memories','leads','email_campaigns','email_sequence_steps','campaign_enrollments','email_messages',
    'integration_accounts','integration_secrets','external_references','ai_actions']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('companies','company'), ('projects','project'), ('tasks','task'), ('calendar_events','calendar_event'),
    ('people','person'), ('notes','note'), ('interactions','interaction'), ('email_messages','email_message'),
    ('leads','lead'), ('finance_transactions','finance_transaction')) as v(tbl, et)
  loop
    execute format('create trigger %I after delete on public.%I for each row execute function private.delete_external_references(%L)',
                   r.tbl || '_delete_external_refs', r.tbl, r.et);
  end loop;
end $$;

-- =============================================================================
-- ROW LEVEL SECURITY (defense in depth; the app also scopes every query by user_id)
-- =============================================================================
do $$
declare t text;
begin
  -- owner full access (select/insert/update/delete)
  foreach t in array array[
    'companies','projects','people','tasks','task_dependencies','calendar_events','finance_accounts','debts',
    'financial_goals','finance_transactions','relationships','interactions','important_dates','notes',
    'memories','leads','email_campaigns','email_sequence_steps','campaign_enrollments','email_messages',
    'email_events','integration_accounts','external_references','ai_actions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format($p$create policy owner_all on public.%I for all to authenticated
                      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- service-role only: RLS on, no policies, no grants to client roles
  foreach t in array array['integration_secrets','idempotency_keys','webhook_deliveries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

alter table profiles enable row level security;
revoke all on profiles from anon;
grant select, update on profiles to authenticated;
create policy profiles_owner_select on profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_owner_update on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- audit_logs: owner may read and append, never change (trigger also blocks service role).
alter table audit_logs enable row level security;
revoke all on audit_logs from anon;
grant select, insert on audit_logs to authenticated;
create policy audit_owner_select on audit_logs for select to authenticated using (user_id = (select auth.uid()));
create policy audit_owner_insert on audit_logs for insert to authenticated with check (user_id = (select auth.uid()));

-- api_keys: owner may list (not the hash) and revoke; creation goes through the server.
alter table api_keys enable row level security;
revoke all on api_keys from anon, authenticated;
grant select (id, user_id, kind, name, environment, prefix, oauth_client_id, scopes, sensitive_scopes_approved_at,
              created_at, expires_at, last_used_at, revoked_at) on api_keys to authenticated;
grant update (revoked_at) on api_keys to authenticated;
create policy api_keys_owner_select on api_keys for select to authenticated using (user_id = (select auth.uid()));
create policy api_keys_owner_revoke on api_keys for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ADR-017: tokens minted by Supabase's OAuth 2.1 server (for ChatGPT) are ordinary `authenticated`
-- JWTs plus a `client_id` claim. They must work ONLY through /api/mcp (scopes enforced in the app),
-- never directly against the Data API. RESTRICTIVE policy = AND-ed with every permissive policy.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','companies','projects','people','tasks','task_dependencies','calendar_events','finance_accounts','debts',
    'financial_goals','finance_transactions','relationships','interactions','important_dates','notes',
    'memories','leads','email_campaigns','email_sequence_steps','campaign_enrollments','email_messages',
    'email_events','integration_accounts','external_references','ai_actions','audit_logs','api_keys']
  loop
    execute format($p$create policy no_oauth_client_tokens on public.%I as restrictive for all to authenticated
                      using ((select auth.jwt()) ->> 'client_id' is null)
                      with check ((select auth.jwt()) ->> 'client_id' is null)$p$, t);
  end loop;
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;  -- triggers run as invoker
revoke execute on function public.record_transfer(uuid, uuid, bigint, date, text) from public, anon;
grant execute on function public.record_transfer(uuid, uuid, bigint, date, text) to authenticated;
-- Supabase default privileges also grant anon on new views; views are security_invoker so anon still gets nothing.
revoke all on finance_account_balances, debt_balances, email_message_delivery, timeline_events from anon;
grant select on finance_account_balances, debt_balances, email_message_delivery, timeline_events to authenticated;

commit;
