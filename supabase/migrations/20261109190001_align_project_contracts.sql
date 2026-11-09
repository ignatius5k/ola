-- Integrate SCRUM-39 with the settled SCRUM-37 vocabulary and SCRUM-9 policy.
-- Generated with CLI 3.0.0; ordered after the teammate's future-dated index
-- migration. Earlier migration files and historical policy rows are retained.

alter table public.cases drop constraint cases_workflow_status_provisional;

do $$
declare c record; target_status text;
begin
  for c in select id, workspace_id, workflow_status, version from public.cases
           where workflow_status in ('new', 'needs_review', 'submitted', 'reviewed_match')
  loop
    target_status := case c.workflow_status
      when 'new' then 'open'
      when 'needs_review' then 'open'
      when 'submitted' then 'awaiting_review'
      when 'reviewed_match' then 'verified'
    end;
    update public.cases set workflow_status = target_status, version = c.version + 1
      where id = c.id and workspace_id = c.workspace_id;
    perform app.append_audit(c.workspace_id, 'case.workflow_contract_aligned', 'system', null,
      p_case_id => c.id, p_case_version => c.version + 1,
      p_payload => jsonb_build_object('from', c.workflow_status, 'to', target_status,
        'migration', '20261109190001'));
  end loop;
end $$;

alter table public.cases alter column workflow_status set default 'open';
alter table public.cases add constraint cases_workflow_status check (workflow_status in
  ('open', 'in_progress', 'awaiting_evidence', 'awaiting_review', 'returned', 'escalated', 'verified', 'auto_matched'));

alter table public.cases drop constraint cases_category_provisional;
alter table public.cases add constraint cases_category_known check (category is null or category in
  ('auto', 'duplicate', 'reversal', 'currency', 'fee', 'amount', 'timing', 'high-value',
   'policy', 'reference', 'missing', 'ledger-conflict', 'invalid'));

-- Add the refined policy; never rewrite demo-1 or silently switch existing
-- workspaces to a new policy. Fresh synthetic seed explicitly selects this one.
insert into public.policy_versions (version, settings, sha256)
select 'SCRUM-9-v1', s, encode(sha256(convert_to(s::text, 'UTF8')), 'hex')
from (select jsonb_build_object(
  'maxPostingDelayMinutes', 30,
  'nearbyCandidateWindowMinutes', 30,
  'largeTransactionThresholds', jsonb_build_object('SGD', 10000, 'USD', 10000),
  'reviewerMatchCategories', jsonb_build_array('fee', 'reference', 'high-value')
) as s) v;

-- History IDs must identify the same case, as well as the same workspace.
alter table public.submissions add constraint submissions_workspace_case_id_key unique (workspace_id, case_id, id);
alter table public.decisions add constraint decisions_workspace_case_id_key unique (workspace_id, case_id, id);
alter table public.cases drop constraint cases_last_submission_fk;
alter table public.cases add constraint cases_last_submission_fk
  foreign key (workspace_id, id, last_submission_id) references public.submissions (workspace_id, case_id, id);
alter table public.decisions drop constraint decisions_workspace_id_submission_id_fkey;
alter table public.decisions add constraint decisions_workspace_id_submission_id_fkey
  foreign key (workspace_id, case_id, submission_id) references public.submissions (workspace_id, case_id, id);
alter table public.ledger_allocations drop constraint ledger_allocations_workspace_id_decision_id_fkey;
alter table public.ledger_allocations add constraint ledger_allocations_workspace_id_decision_id_fkey
  foreign key (workspace_id, case_id, decision_id) references public.decisions (workspace_id, case_id, id);
alter table public.ledger_allocations drop constraint allocations_has_origin;
alter table public.ledger_allocations add constraint allocations_has_origin
  check (num_nonnulls(decision_id, run_id) = 1);
create index cases_last_submission_case_idx on public.cases (workspace_id, id, last_submission_id);
create index decisions_submission_case_idx on public.decisions (workspace_id, case_id, submission_id);
create index allocations_decision_case_idx on public.ledger_allocations (workspace_id, case_id, decision_id);

-- A path in one's workspace is not sufficient: only attached originals and
-- evidence may be read. Failed imports/uploads can leave private orphan objects.
alter policy originals_member_read on storage.objects using (
  bucket_id = 'originals' and exists (
    select 1 from public.import_batches b where b.file_object_path = storage.objects.name
      and b.workspace_id in (select app.member_workspace_ids())
  )
);
alter policy evidence_member_read on storage.objects using (
  bucket_id = 'evidence' and exists (
    select 1 from public.evidence e where e.object_path = storage.objects.name
      and e.workspace_id in (select app.member_workspace_ids())
  )
);
