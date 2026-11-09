-- Database Foundation / 5 of 5: grants, row level security, storage and read views.
--
-- Model: authenticated clients can only SELECT, only inside workspaces where
-- they are an active member. Every write (membership, policy, workflow,
-- decision, allocation, audit, evidence metadata, imports) is denied at the
-- grant level AND has no RLS write policy; SCRUM-42 routines perform them.

-- Privileged helpers (the only SECURITY DEFINER code in this ticket) ---------------
-- Required because workspace_members itself is protected by RLS: policies must
-- resolve "which workspaces is the caller in" without recursing into that policy.
-- Controls: fixed empty search_path, takes no user argument (identity comes from
-- auth.uid()), read-only, EXECUTE only for authenticated and service_role.
create function app.member_workspace_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.workspace_id from public.workspace_members m
   where m.user_id = (select auth.uid()) and m.active
$$;

create function app.has_workspace_role(p_workspace_id uuid, p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
     where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
       and m.active and m.role = any (p_roles))
$$;

-- Function and schema privileges -----------------------------------------------------
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;
revoke all on all functions in schema app from public, anon, authenticated;
alter default privileges in schema app revoke execute on functions from public, anon, authenticated;
grant execute on all functions in schema app to service_role;
grant execute on function app.member_workspace_ids() to authenticated;
grant execute on function app.has_workspace_role(uuid, public.member_role[]) to authenticated;

-- Table privileges: remove Supabase's permissive defaults, then grant read only ---------
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant select on public.policy_versions, public.workspaces, public.workspace_members, public.profiles,
  public.import_batches, public.collections, public.ledger_postings, public.cases, public.case_drafts,
  public.evidence, public.submissions, public.decisions, public.ledger_allocations,
  public.reconciliation_runs, public.run_events, public.audit_events
  to authenticated;
-- idempotency_requests: no client privileges at all.

-- Row level security ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['policy_versions','workspaces','workspace_members','profiles','import_batches',
    'collections','ledger_postings','cases','case_drafts','evidence','submissions','decisions',
    'ledger_allocations','reconciliation_runs','run_events','audit_events','idempotency_requests'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- Tables scoped by a workspace_id column.
  foreach t in array array['workspace_members','import_batches','collections','ledger_postings','cases',
    'case_drafts','evidence','submissions','decisions','ledger_allocations','reconciliation_runs',
    'run_events','audit_events'] loop
    execute format($f$create policy %I on public.%I for select to authenticated
                      using (workspace_id in (select app.member_workspace_ids()))$f$, t || '_member_read', t);
  end loop;
end $$;

create policy workspaces_member_read on public.workspaces for select to authenticated
  using (id in (select app.member_workspace_ids()));

-- The policy catalogue holds no tenant data; any signed-in user may read it.
create policy policy_versions_read on public.policy_versions for select to authenticated using (true);

-- Display names: your own, plus those of people who share a workspace with you.
create policy profiles_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid())
         or user_id in (select m.user_id from public.workspace_members m
                         where m.workspace_id in (select app.member_workspace_ids())));

-- Explicit deny keeps the table lint-clean while documenting intent.
create policy idempotency_no_client_access on public.idempotency_requests for all to authenticated
  using (false) with check (false);

-- Read views (read-model contract) -----------------------------------------------------------
-- security_invoker => the caller's RLS applies. Money is exposed as integer strings.
create view public.collection_read with (security_invoker = true) as
  select id, workspace_id, import_batch_id, source_system, source_record_id, reference, counterparty,
         amount_minor::text as amount_minor, currency, recorded_at, channel, source_hash
    from public.collections;

create view public.ledger_posting_read with (security_invoker = true) as
  select id, workspace_id, import_batch_id, source_system, source_record_id, reference, counterparty,
         amount_minor::text as amount_minor, fee_minor::text as fee_minor, currency, posting_type,
         recorded_at, channel, source_hash
    from public.ledger_postings;

create view public.submission_read with (security_invoker = true) as
  select id, workspace_id, case_id, submitted_by, case_version, rule_version, proposed_ledger_id,
         findings, source_snapshot, evidence_ids, status,
         created_at as submitted_at      -- DTO: submittedAt
    from public.submissions;

create view public.collection_totals_read with (security_invoker = true) as
  select workspace_id, currency, count(*)::text as record_count, sum(amount_minor)::text as total_minor
    from public.collections group by workspace_id, currency;

grant select on public.collection_read, public.ledger_posting_read, public.submission_read,
  public.collection_totals_read to authenticated;

-- Storage ----------------------------------------------------------------------------------------
-- Private buckets. Originals are written only by the server (service_role); evidence
-- is insert-only for analysts. No UPDATE/DELETE policy exists, so objects can never be
-- overwritten or removed by a client; cleanup of unattached objects uses service_role.
-- Anonymous users must not access Storage objects.
revoke all privileges on table storage.objects from anon;
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('originals', 'originals', false, array['text/csv']),
       ('evidence',  'evidence',  false, null)
on conflict (id) do update set public = false;

create policy originals_member_read on storage.objects for select to authenticated
  using (bucket_id = 'originals'
         and (storage.foldername(name))[1] in (select w::text from app.member_workspace_ids() w));

create policy evidence_member_read on storage.objects for select to authenticated
  using (bucket_id = 'evidence'
         and (storage.foldername(name))[1] in (select w::text from app.member_workspace_ids() w));

-- Path must be <workspaceUUID>/<caseUUID>/<objectUUID>, the case must exist in that
-- workspace, and the uploader must be an active analyst there.
create policy evidence_analyst_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and case when name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then app.has_workspace_role((storage.foldername(name))[1]::uuid, array['analyst']::public.member_role[])
             and exists (select 1 from public.cases c
                          where c.id = (storage.foldername(name))[2]::uuid
                            and c.workspace_id = (storage.foldername(name))[1]::uuid)
        else false end);
