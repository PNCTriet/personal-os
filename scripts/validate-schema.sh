#!/usr/bin/env bash
# Validates (1) the PROPOSED full schema and (2) the real migrations in supabase/migrations,
# each against a throwaway local PostgreSQL (15+) with Supabase stubs.
# Usage: PGHOST=/var/run/postgresql scripts/validate-schema.sh
set -euo pipefail
DB="${VALIDATE_DB:-personal_os_scratch}"
cd "$(dirname "$0")/.."
run() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

dropdb --if-exists "$DB"; createdb "$DB"
run -f supabase/validation/00_supabase_stub.sql
run -f supabase/proposal/0000_proposed_schema.sql
run -o /dev/null -f supabase/validation/01_smoke_test.sql
echo "PROPOSED SCHEMA VALIDATION PASSED"

dropdb --if-exists "$DB"; createdb "$DB"
run -f supabase/validation/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do run -f "$f"; done
run -f supabase/validation/02_mvp_migration_smoke.sql
echo "MIGRATIONS VALIDATION PASSED"
