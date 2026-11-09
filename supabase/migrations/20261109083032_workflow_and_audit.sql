-- Database Foundation / 3 of 5: allocations, reconciliation runs, audit trail, idempotency.

-- Reconciliation runs and their diagnostic events ---------------------------------
create table public.reconciliation_runs (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id),
  actor_id       uuid,                       -- null for system-initiated runs
  rule_version   text not null references public.policy_versions (version),
  status         public.run_status not null default 'queued',
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  error_code     text,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, actor_id) references public.workspace_members (workspace_id, user_id),
  constraint runs_completed_has_timestamp check (status <> 'completed' or completed_at is not null),
  constraint runs_failed_has_error        check (status <> 'failed' or error_code is not null)
);

-- Pre-commit stage events are diagnostic/provisional; only a 'completed' run
-- has applied final case/allocation outcomes.
create table public.run_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  run_id       uuid not null,
  sequence     integer not null check (sequence >= 0),
  case_id      uuid,
  stage        text not null check (length(btrim(stage)) > 0),
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (run_id, sequence),
  foreign key (workspace_id, run_id) references public.reconciliation_runs (workspace_id, id),
  foreign key (workspace_id, case_id) references public.cases (workspace_id, id)
);
create index run_events_case_idx on public.run_events (workspace_id, case_id);

-- Ledger allocations ---------------------------------------------------------------
create table public.ledger_allocations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  case_id      uuid not null,
  ledger_id    uuid not null,
  decision_id  uuid,          -- reviewer-decided allocation
  run_id       uuid,          -- rules-engine allocation
  allocated_at timestamptz not null default now(),
  released_at  timestamptz,
  foreign key (workspace_id, case_id)     references public.cases (workspace_id, id),
  foreign key (workspace_id, ledger_id)   references public.ledger_postings (workspace_id, id),
  foreign key (workspace_id, decision_id) references public.decisions (workspace_id, id),
  foreign key (workspace_id, run_id)      references public.reconciliation_runs (workspace_id, id),
  constraint allocations_has_origin   check (decision_id is not null or run_id is not null),
  constraint allocations_release_order check (released_at is null or released_at >= allocated_at)
);
-- At most one ACTIVE allocation per ledger posting and per case, per workspace.
create unique index ledger_allocations_active_ledger_uidx
  on public.ledger_allocations (workspace_id, ledger_id) where released_at is null;
create unique index ledger_allocations_active_case_uidx
  on public.ledger_allocations (workspace_id, case_id) where released_at is null;
create index ledger_allocations_decision_idx on public.ledger_allocations (workspace_id, decision_id);
create index ledger_allocations_run_idx      on public.ledger_allocations (workspace_id, run_id);

-- Audit trail (append-only) ---------------------------------------------------------
create table public.audit_events (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id),
  case_id          uuid,
  event_type       text not null check (length(btrim(event_type)) > 0),
  actor_kind       public.actor_kind not null,
  actor_user_id    uuid,
  occurred_at      timestamptz not null default clock_timestamp(),  -- forced server-side by trigger
  request_id       text,
  run_id           uuid,
  submission_id    uuid,
  decision_id      uuid,
  import_batch_id  uuid,
  case_version     integer,
  payload          jsonb not null,
  foreign key (workspace_id, case_id)         references public.cases (workspace_id, id),
  foreign key (workspace_id, actor_user_id)   references public.workspace_members (workspace_id, user_id),
  foreign key (workspace_id, run_id)          references public.reconciliation_runs (workspace_id, id),
  foreign key (workspace_id, submission_id)   references public.submissions (workspace_id, id),
  foreign key (workspace_id, decision_id)     references public.decisions (workspace_id, id),
  foreign key (workspace_id, import_batch_id) references public.import_batches (workspace_id, id),
  -- actor_user_id may be null only for system events.
  constraint audit_user_actor_required check (actor_kind = 'system' or actor_user_id is not null),
  constraint audit_payload_schema check (jsonb_typeof(payload) = 'object' and payload ? 'schemaVersion')
);
create index audit_workspace_time_idx on public.audit_events (workspace_id, occurred_at);
create index audit_case_idx           on public.audit_events (workspace_id, case_id) where case_id is not null;
create index audit_run_idx            on public.audit_events (workspace_id, run_id) where run_id is not null;
create index audit_submission_idx     on public.audit_events (workspace_id, submission_id) where submission_id is not null;
create index audit_import_batch_idx   on public.audit_events (workspace_id, import_batch_id) where import_batch_id is not null;

-- Idempotency ---------------------------------------------------------------------------
create table public.idempotency_requests (
  workspace_id uuid not null references public.workspaces (id),
  user_id      uuid not null,
  action       text not null check (length(btrim(action)) > 0),
  key          text not null check (length(key) between 8 and 200),
  resource_id  uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  status       public.idempotency_status not null default 'pending',
  result_json  jsonb,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id, action, key),   -- unique request identity
  foreign key (workspace_id, user_id) references public.workspace_members (workspace_id, user_id),
  constraint idempotency_outcome_recorded check (status = 'pending' or result_json is not null)
);
