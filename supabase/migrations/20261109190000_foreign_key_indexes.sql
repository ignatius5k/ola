-- Add indexes for foreign keys identified by Supabase Database Advisors.

create index audit_events_workspace_actor_idx
  on public.audit_events (workspace_id, actor_user_id);

create index audit_events_workspace_decision_idx
  on public.audit_events (workspace_id, decision_id);

create index case_drafts_workspace_author_idx
  on public.case_drafts (workspace_id, author_id);

create index case_drafts_workspace_case_idx
  on public.case_drafts (workspace_id, case_id);

create index case_drafts_workspace_ledger_idx
  on public.case_drafts (workspace_id, proposed_ledger_id);

create index cases_workspace_submission_idx
  on public.cases (workspace_id, last_submission_id);

create index cases_workspace_analyst_idx
  on public.cases (workspace_id, assigned_analyst_id);

create index cases_workspace_collection_idx
  on public.cases (workspace_id, collection_id);

create index cases_workspace_creator_idx
  on public.cases (workspace_id, creator_id);

create index collections_workspace_creator_idx
  on public.collections (workspace_id, created_by);

create index decisions_workspace_reviewer_idx
  on public.decisions (workspace_id, reviewer_id);

create index decisions_workspace_submission_idx
  on public.decisions (workspace_id, submission_id);

create index evidence_workspace_uploader_idx
  on public.evidence (workspace_id, uploaded_by);

create index import_batches_workspace_creator_idx
  on public.import_batches (workspace_id, created_by);

create index ledger_postings_workspace_creator_idx
  on public.ledger_postings (workspace_id, created_by);

create index reconciliation_runs_rule_version_idx
  on public.reconciliation_runs (rule_version);

create index reconciliation_runs_workspace_actor_idx
  on public.reconciliation_runs (workspace_id, actor_id);

create index run_events_workspace_run_idx
  on public.run_events (workspace_id, run_id);

create index submissions_rule_version_idx
  on public.submissions (rule_version);

create index submissions_workspace_ledger_idx
  on public.submissions (workspace_id, proposed_ledger_id);

create index submissions_workspace_submitter_idx
  on public.submissions (workspace_id, submitted_by);

create index workspaces_active_rule_version_idx
  on public.workspaces (active_rule_version);