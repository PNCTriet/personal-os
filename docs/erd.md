# ERD — Personal OS (proposed)

Source of truth for columns/constraints: `supabase/migrations/0000_proposed_schema.sql`. This diagram shows keys and the
attributes that matter for reasoning. Every table also has `user_id -> auth.users` (omitted from edges for readability),
`created_at`, `updated_at`; most have `archived_at` / `deleted_at`.

Validated with `@mermaid-js/mermaid-cli` (`mmdc`), see `scripts/validate-mermaid.sh`.

## Core, Work, Time, Knowledge, Relationships

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "has"
    COMPANIES ||--o{ PROJECTS : "client of"
    COMPANIES ||--o{ PEOPLE : "employs"
    PROJECTS ||--o{ TASKS : "contains"
    TASKS ||--o{ TASK_DEPENDENCIES : "is blocked by"
    TASKS ||--o{ TASK_DEPENDENCIES : "blocks"
    TASKS ||--o{ CALENDAR_EVENTS : "scheduled as"
    PROJECTS ||--o{ CALENDAR_EVENTS : "context of"
    PEOPLE ||--o{ TASKS : "follow-up target"
    COMPANIES ||--o{ TASKS : "related to"
    PEOPLE ||--o{ RELATIONSHIPS : "owner relates as"
    PEOPLE ||--o{ INTERACTIONS : "with"
    CALENDAR_EVENTS ||--o{ INTERACTIONS : "evidence"
    PEOPLE ||--o{ IMPORTANT_DATES : "has"
    PEOPLE ||--o{ MEMORIES : "about"
    MEMORIES ||--o| MEMORIES : "supersedes"
    PROJECTS ||--o{ NOTES : "context of"
    PEOPLE ||--o{ NOTES : "about"

    AUTH_USERS {
        uuid id PK
        text email
    }
    PROFILES {
        uuid id PK "= auth.users.id"
        text timezone "defines today"
        char base_currency
        jsonb settings
    }
    COMPANIES {
        uuid id PK
        text name
        citext domain UK
        enum classification
    }
    PROJECTS {
        uuid id PK
        text code UK "HOWL-VTO-01, immutable"
        text name
        enum status
        uuid company_id FK
        int next_task_seq
        enum classification
    }
    TASKS {
        uuid id PK
        text code UK "HOWL-VTO-01-T01"
        text_array previous_codes
        uuid project_id FK
        text title
        enum status
        enum priority
        enum kind "task, follow_up, milestone"
        date due_on
        timestamptz completed_at
        uuid person_id FK
        uuid company_id FK
        enum classification
    }
    TASK_DEPENDENCIES {
        uuid task_id PK, FK
        uuid depends_on_task_id PK, FK
    }
    CALENDAR_EVENTS {
        uuid id PK
        text title
        timestamptz starts_at
        timestamptz ends_at
        enum kind
        enum status
        uuid task_id FK
        uuid project_id FK
        jsonb attendees
    }
    PEOPLE {
        uuid id PK
        text display_name
        citext_array emails
        uuid company_id FK
        timestamptz email_opt_out_at
        enum classification
    }
    RELATIONSHIPS {
        uuid id PK
        uuid person_id FK
        enum kind
        smallint closeness
        enum classification "romantic => sensitive"
    }
    INTERACTIONS {
        uuid id PK
        uuid person_id FK
        timestamptz occurred_at
        enum channel
        text summary
        uuid calendar_event_id FK
        uuid email_message_id FK
    }
    IMPORTANT_DATES {
        uuid id PK
        uuid person_id FK "null = owner"
        enum kind
        smallint month
        smallint day
        smallint year
    }
    NOTES {
        uuid id PK
        enum kind
        text title
        text body
        tsvector search
        uuid project_id FK
        uuid person_id FK
        enum classification
    }
    MEMORIES {
        uuid id PK
        uuid person_id FK
        enum category
        text content
        smallint importance
        numeric confidence
        enum source
        timestamptz valid_from
        timestamptz valid_until
        uuid supersedes_id FK
    }
```

## Finance

```mermaid
erDiagram
    FINANCE_ACCOUNTS ||--o{ FINANCE_TRANSACTIONS : "posts"
    DEBTS ||--o{ FINANCE_TRANSACTIONS : "repaid by"
    PEOPLE ||--o{ DEBTS : "counterparty"
    COMPANIES ||--o{ DEBTS : "counterparty"
    PEOPLE ||--o{ FINANCE_TRANSACTIONS : "counterparty"
    FINANCE_ACCOUNTS ||--o{ FINANCIAL_GOALS : "tracks progress"

    FINANCE_ACCOUNTS {
        uuid id PK
        text name
        enum type
        char currency
        bigint opening_balance_minor
    }
    FINANCE_TRANSACTIONS {
        uuid id PK
        uuid account_id FK
        date occurred_on
        bigint amount_minor "signed"
        char currency "= account currency"
        enum kind
        uuid debt_id FK
        uuid transfer_group_id
    }
    DEBTS {
        uuid id PK
        enum direction "payable, receivable"
        uuid person_id FK
        bigint principal_minor
        char currency
        enum status
    }
    FINANCIAL_GOALS {
        uuid id PK
        text name
        bigint target_minor
        uuid account_id FK
        enum status
    }
    PEOPLE {
        uuid id PK
    }
    COMPANIES {
        uuid id PK
    }
```

Derived (views, not tables): `finance_account_balances`, `debt_balances`.

## Communication (Phase 4)

```mermaid
erDiagram
    PEOPLE ||--o{ LEADS : "is"
    COMPANIES ||--o{ LEADS : "is"
    EMAIL_CAMPAIGNS ||--o{ EMAIL_SEQUENCE_STEPS : "has"
    EMAIL_CAMPAIGNS ||--o{ CAMPAIGN_ENROLLMENTS : "enrolls"
    LEADS ||--o{ CAMPAIGN_ENROLLMENTS : "enrolled in"
    CAMPAIGN_ENROLLMENTS ||--o{ EMAIL_MESSAGES : "produces"
    EMAIL_SEQUENCE_STEPS ||--o{ EMAIL_MESSAGES : "rendered from"
    PEOPLE ||--o{ EMAIL_MESSAGES : "recipient"
    EMAIL_MESSAGES ||--o{ EMAIL_EVENTS : "delivery events"
    INTEGRATION_ACCOUNTS ||--o{ EMAIL_MESSAGES : "sent via (gmail)"

    LEADS {
        uuid id PK
        uuid person_id FK
        uuid company_id FK
        enum status
    }
    EMAIL_CAMPAIGNS {
        uuid id PK
        text name
        enum status
        citext from_email
    }
    EMAIL_SEQUENCE_STEPS {
        uuid id PK
        uuid campaign_id FK
        smallint step_number UK
        smallint delay_days
    }
    CAMPAIGN_ENROLLMENTS {
        uuid id PK
        uuid campaign_id FK
        uuid lead_id FK
        enum status
        smallint current_step
        timestamptz next_send_at
    }
    EMAIL_MESSAGES {
        uuid id PK
        enum provider "gmail, resend"
        enum status
        citext_array to_emails
        text subject
        text provider_message_id UK
        timestamptz sent_at
    }
    EMAIL_EVENTS {
        uuid id PK
        uuid email_message_id FK
        enum type
        text provider_event_id UK "idempotency"
    }
    PEOPLE {
        uuid id PK
    }
    COMPANIES {
        uuid id PK
    }
    INTEGRATION_ACCOUNTS {
        uuid id PK
    }
```

## Integrations & Platform

```mermaid
erDiagram
    INTEGRATION_ACCOUNTS ||--o| INTEGRATION_SECRETS : "credentials"
    INTEGRATION_ACCOUNTS ||--o{ EXTERNAL_REFERENCES : "resolves"
    API_KEYS ||--o{ AI_ACTIONS : "made by"
    AI_ACTIONS ||--o{ AUDIT_LOGS : "recorded as"

    INTEGRATION_ACCOUNTS {
        uuid id PK
        enum provider
        text external_account_id UK
        enum status
        text_array scopes
        timestamptz token_expires_at
        timestamptz refresh_token_expires_at
        jsonb sync_state
    }
    INTEGRATION_SECRETS {
        uuid integration_account_id PK, FK
        text access_token_encrypted
        text refresh_token_encrypted
        smallint key_version
    }
    EXTERNAL_REFERENCES {
        uuid id PK
        enum entity_type "polymorphic"
        uuid entity_id "polymorphic"
        enum provider
        enum external_type
        text external_id
        text etag
        enum sync_status
    }
    API_KEYS {
        uuid id PK
        text prefix
        bytea secret_hash UK
        text_array scopes
        timestamptz expires_at
        timestamptz revoked_at
    }
    AI_ACTIONS {
        uuid id PK
        text tool_name
        text operation
        enum category
        enum status
        jsonb input
        text input_hash
        timestamptz confirmation_expires_at
        text auto_approval_rule
    }
    AUDIT_LOGS {
        bigint id PK
        enum actor_type
        uuid actor_id
        enum source
        text action
        enum entity_type
        uuid entity_id
        enum status
    }
    IDEMPOTENCY_KEYS {
        uuid user_id PK
        text key PK
        text request_hash
        jsonb response_body
    }
    WEBHOOK_DELIVERIES {
        uuid id PK
        enum provider
        text delivery_id UK
        enum status
    }
```
