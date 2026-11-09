#!/usr/bin/env bash
# Fallback verification when Docker/Supabase CLI cannot run: applies migrations,
# seed and pgTAP files to a throw-away PostgreSQL cluster with a small Supabase shim.
# Usage: scripts/verify-plain-postgres.sh   (needs postgresql + pgtap installed, run as root or postgres)
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
DATA=/tmp/ola-pg; PORT=54399; export PGPORT=$PORT PGHOST=/tmp PGUSER=postgres
if [ "$(id -u)" = 0 ]; then RUN="su postgres -c"; else RUN="bash -c"; fi
rm -rf "$DATA"; mkdir -p "$DATA"; chown postgres "$DATA" 2>/dev/null || true
$RUN "$PGBIN/initdb -D $DATA -U postgres >/dev/null"
$RUN "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log -w start >/dev/null"
trap '$RUN "$PGBIN/pg_ctl -D $DATA -m immediate stop >/dev/null"' EXIT
P="$PGBIN/psql -X -q -v ON_ERROR_STOP=1 -d postgres"
$RUN "$P -c 'create extension if not exists pgtap'" 
$RUN "$P -f scripts/supabase-shim.sql"
for f in supabase/migrations/*.sql; do echo "migration: $f"; $RUN "$P -f $f"; done
$RUN "$P -f supabase/seed.sql"
PROVE=$(command -v pg_prove || true)
if [ -n "$PROVE" ]; then
  $RUN "$PROVE -d postgres -U postgres -h /tmp -p $PORT supabase/tests/database/*.test.sql"
else
  fail=0
  for t in supabase/tests/database/*.test.sql; do
    out=$($RUN "$PGBIN/psql -X -q -t -A -d postgres -f $t" 2>&1); echo "$out" | grep -E '^(not ok|#)' && fail=1; echo "$t: $(echo "$out" | grep -c '^ok') ok"
  done
  exit $fail
fi
