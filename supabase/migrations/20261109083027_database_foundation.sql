-- Database Foundation / 1 of 5: foundation
-- Types, the immutable policy catalogue, workspaces, membership and profiles.
--
-- Custom SQLSTATEs used by Ola (documented in docs/data-model.md):
--   OL404 case/resource not found     OL409 optimistic version conflict
--   OL422 idempotency key reused with a different payload
-- Append-only violations raise the standard 42501 (insufficient_privilege).

create schema if not exists app;
comment on schema app is
  'Ola internal helpers and transaction primitives. Not in the PostgREST exposed schemas.';

-- Enumerations -------------------------------------------------------------
create type public.member_role        as enum ('analyst', 'reviewer');
create type public.import_kind        as enum ('collection', 'ledger');
create type public.import_status      as enum ('accepted', 'rejected');
create type public.import_origin      as enum ('csv_import', 'manual', 'seed');
create type public.currency_code      as enum ('SGD', 'USD');
create type public.posting_type       as enum ('credit', 'reversal');
create type public.submission_status  as enum ('submitted', 'decided', 'superseded');
create type public.decision_outcome   as enum ('reviewed_match', 'escalated');
create type public.run_status         as enum ('queued', 'running', 'completed', 'failed');
create type public.actor_kind         as enum ('user', 'system');
create type public.idempotency_status as enum ('pending', 'succeeded', 'rejected');

-- Immutable policy catalogue ----------------------------------------------
create table public.policy_versions (
  version  text primary key check (version ~ '^[A-Za-z0-9._-]{1,64}$'),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  sha256   text  not null,
  constraint policy_versions_sha256_matches check (
    sha256 = encode(sha256(convert_to(settings::text, 'UTF8')), 'hex')
  )
);
comment on table public.policy_versions is
  'Code/migration-controlled, immutable. sha256 is over settings::text (jsonb canonical text) and is verified by a CHECK.';

-- Workspaces and membership -------------------------------------------------
create table public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(btrim(name)) between 1 and 200),
  active_rule_version text not null references public.policy_versions (version),
  created_at          timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id),
  user_id      uuid not null references auth.users (id),
  role         public.member_role not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id) where active;

-- Display data only; never consulted for authorisation.
create table public.profiles (
  user_id      uuid primary key references auth.users (id),
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  created_at   timestamptz not null default now()
);

-- First policy version. Mirrors RULE_SETTINGS in src/rules.js (major-unit
-- thresholds, as the engine reads them); money in *records* is minor units.
insert into public.policy_versions (version, settings, sha256)
select 'demo-1', s, encode(sha256(convert_to(s::text, 'UTF8')), 'hex')
from (select jsonb_build_object(
  'maxPostingDelayMinutes', 30,
  'nearbyCandidateWindowMinutes', 30,
  'feeExplanationTolerance', 0.001,
  'largeTransactionThresholds', jsonb_build_object('SGD', 10000, 'USD', 10000),
  'reviewerMatchCategories', jsonb_build_array('fee', 'reference', 'high-value')
) as s) v;
