#!/usr/bin/env bash
# Validates the PROPOSED schema against a throwaway local PostgreSQL (15+).
# Usage: PGHOST=/var/run/postgresql scripts/validate-schema.sh
set -euo pipefail
DB="${VALIDATE_DB:-personal_os_scratch}"
cd "$(dirname "$0")/.."
dropdb --if-exists "$DB"
createdb "$DB"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/validation/00_supabase_stub.sql
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/migrations/0000_proposed_schema.sql
psql -X -q -v ON_ERROR_STOP=1 -o /dev/null -d "$DB" -f supabase/validation/01_smoke_test.sql
echo "SCHEMA VALIDATION PASSED"
