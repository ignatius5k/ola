-- Database Foundation / 2 of 5: immutable source records, cases, drafts, evidence,
-- submissions and decisions. Every cross-table reference is a composite
-- (workspace_id, id) key so a row can never point into another workspace.

-- Import batches ------------------------------------------------------------
create table public.import_batches (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id),
  source_system    text not null check (length(btrim(source_system)) > 0),
  origin           public.import_origin not null,
  file_sha256      text check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_object_path text,
  kind             public.import_kind not null,
  status           public.import_status not null default 'accepted',
  created_by       uuid,
  created_at       timestamptz not null default now(),
  error_summary    text,
  unique (workspace_id, id),
  foreign key (workspace_id, created_by) references public.workspace_members (workspace_id, user_id),
  -- Path convention: <workspaceUUID>/<importUUID>/original.csv
  constraint import_batches_path_convention check (
    file_object_path is null
    or file_object_path = workspace_id::text || '/' || id::text || '/original.csv'
  ),
  -- User CSV imports must carry the archived original and its hash.
  constraint import_batches_csv_requires_object check (
    origin <> 'csv_import' or (file_object_path is not null and file_sha256 is not null and created_by is not null)
  ),
  constraint import_batches_rejected_has_summary check (
    (status = 'rejected') = (error_summary is not null)
  )
);
comment on column public.import_batches.origin is
  'Added to the spec: distinguishes user CSV imports (file_object_path required) from trusted seed/manual records (nullable).';

-- Shared money/format rules for both source tables ---------------------------
-- (declared per table: Postgres has no table inheritance for constraints we want to keep independent)

create table public.collections (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id),
  import_batch_id  uuid not null,
  source_system    text not null check (length(btrim(source_system)) > 0),
  source_record_id text not null check (length(btrim(source_record_id)) > 0),
  reference        text not null check (length(btrim(reference)) > 0),
  counterparty     text not null check (length(btrim(counterparty)) > 0),
  amount_minor     bigint not null,
  currency         public.currency_code not null,
  recorded_at      timestamptz not null,
  channel          text not null check (length(btrim(channel)) > 0),
  created_by       uuid,
  source_hash      text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  raw_payload      jsonb not null check (jsonb_typeof(raw_payload) = 'object'),
  unique (workspace_id, id),
  unique (workspace_id, source_system, source_record_id),
  foreign key (workspace_id, import_batch_id) references public.import_batches (workspace_id, id),
  foreign key (workspace_id, created_by) references public.workspace_members (workspace_id, user_id),
  constraint collections_amount_positive check (amount_minor > 0),
  constraint collections_amount_safe_integer check (amount_minor <= 9007199254740991)
);
create index collections_batch_idx     on public.collections (workspace_id, import_batch_id);
create index collections_reference_idx on public.collections (workspace_id, reference);

create table public.ledger_postings (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id),
  import_batch_id  uuid not null,
  source_system    text not null check (length(btrim(source_system)) > 0),
  source_record_id text not null check (length(btrim(source_record_id)) > 0),
  reference        text not null check (length(btrim(reference)) > 0), -- intentionally NOT unique
  counterparty     text,   -- not present in ledger exports; nullable here, required on collections
  amount_minor     bigint not null,
  currency         public.currency_code not null,
  recorded_at      timestamptz not null,
  channel          text,
  created_by       uuid,
  source_hash      text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  raw_payload      jsonb not null check (jsonb_typeof(raw_payload) = 'object'),
  posting_type     public.posting_type not null,
  fee_minor        bigint not null default 0,
  unique (workspace_id, id),
  unique (workspace_id, source_system, source_record_id),
  foreign key (workspace_id, import_batch_id) references public.import_batches (workspace_id, id),
  foreign key (workspace_id, created_by) references public.workspace_members (workspace_id, user_id),
  constraint ledger_amount_safe_integer check (abs(amount_minor) <= 9007199254740991),
  constraint ledger_credit_non_negative check (posting_type <> 'credit'   or amount_minor >= 0),
  constraint ledger_reversal_negative   check (posting_type <> 'reversal' or amount_minor < 0),
  constraint ledger_fee_range           check (fee_minor >= 0 and fee_minor <= 9007199254740991)
);
create index ledger_batch_idx     on public.ledger_postings (workspace_id, import_batch_id);
create index ledger_reference_idx on public.ledger_postings (workspace_id, reference);

-- Cases and drafts ------------------------------------------------------------
-- NOTE: category / workflow_status value lists are PROVISIONAL, taken from the
-- prototype engine (src/engine.js). SCRUM-38 owns the canonical state machine;
-- replace the two CHECK constraints in one migration when its constants land.
create table public.cases (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id),
  collection_id        uuid not null unique,
  category             text,
  workflow_status      text not null default 'new',
  assigned_analyst_id  uuid,
  creator_id           uuid,
  version              integer not null default 1 check (version >= 1),
  queue_entered_at     timestamptz,
  last_submission_id   uuid,
  needs_revalidation   boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, collection_id)        references public.collections (workspace_id, id),
  foreign key (workspace_id, assigned_analyst_id)  references public.workspace_members (workspace_id, user_id),
  foreign key (workspace_id, creator_id)           references public.workspace_members (workspace_id, user_id),
  constraint cases_category_provisional check (category is null or category in
    ('auto','duplicate','reversal','currency','fee','amount','timing','high-value','policy','reference','missing','ledger-conflict')),
  constraint cases_workflow_status_provisional check (workflow_status in
    ('new','awaiting_evidence','needs_review','auto_matched','submitted','reviewed_match','escalated'))
);
create index cases_status_idx on public.cases (workspace_id, workflow_status);

create table public.case_drafts (
  case_id            uuid primary key,
  workspace_id       uuid not null,
  author_id          uuid not null,
  proposed_ledger_id uuid,
  findings           text not null default '',
  evidence_ids       uuid[] not null default '{}',
  updated_at         timestamptz not null default now(),
  version            integer not null default 1 check (version >= 1),
  foreign key (workspace_id, case_id)            references public.cases (workspace_id, id),
  foreign key (workspace_id, author_id)          references public.workspace_members (workspace_id, user_id),
  foreign key (workspace_id, proposed_ledger_id) references public.ledger_postings (workspace_id, id)
);

-- Evidence attachments (uploaded files only) ------------------------------------
create table public.evidence (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  case_id      uuid not null,
  object_path  text not null unique,
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null check (length(btrim(content_type)) > 0),
  size_bytes   bigint not null check (size_bytes > 0),
  uploaded_by  uuid not null,
  created_at   timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, case_id, id),
  foreign key (workspace_id, case_id)     references public.cases (workspace_id, id),
  foreign key (workspace_id, uploaded_by) references public.workspace_members (workspace_id, user_id),
  -- Path convention: <workspaceUUID>/<caseUUID>/<objectUUID>; the object UUID is this row's id.
  constraint evidence_path_convention check (
    object_path = workspace_id::text || '/' || case_id::text || '/' || id::text
  )
);
create index evidence_case_idx on public.evidence (workspace_id, case_id);

-- Submissions and decisions ---------------------------------------------------------
create table public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null,
  case_id            uuid not null,
  submitted_by       uuid not null,
  case_version       integer not null check (case_version >= 1),
  rule_version       text not null references public.policy_versions (version),
  proposed_ledger_id uuid,
  findings           text not null default '',
  source_snapshot    jsonb not null default '{}'::jsonb,
  evidence_ids       uuid[] not null default '{}',   -- attachment UUIDs only; may be empty
  status             public.submission_status not null default 'submitted',
  created_at         timestamptz not null default now(),   -- read DTO alias: submittedAt
  unique (workspace_id, id),
  unique (workspace_id, case_id, case_version),
  foreign key (workspace_id, case_id)            references public.cases (workspace_id, id),
  foreign key (workspace_id, submitted_by)       references public.workspace_members (workspace_id, user_id),
  foreign key (workspace_id, proposed_ledger_id) references public.ledger_postings (workspace_id, id),
  constraint submissions_snapshot_shape check (
    jsonb_typeof(source_snapshot) = 'object'
    and source_snapshot ? 'schemaVersion' and source_snapshot ? 'collection'
  )
);
create index submissions_case_idx on public.submissions (workspace_id, case_id);

alter table public.cases
  add constraint cases_last_submission_fk
  foreign key (workspace_id, last_submission_id) references public.submissions (workspace_id, id);

create table public.decisions (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null,
  case_id                uuid not null,
  submission_id          uuid not null unique,   -- one decision per submission
  reviewer_id            uuid not null,
  outcome                public.decision_outcome not null,
  reason                 text not null check (length(btrim(reason)) >= 8),
  verified_large_amount  boolean not null default false,
  snapshot               jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at             timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, case_id)       references public.cases (workspace_id, id),
  foreign key (workspace_id, submission_id) references public.submissions (workspace_id, id),
  foreign key (workspace_id, reviewer_id)   references public.workspace_members (workspace_id, user_id)
);
create index decisions_case_idx on public.decisions (workspace_id, case_id);
