-- Database Foundation / 4 of 5: integrity triggers and transaction primitives.
-- Everything here is SECURITY INVOKER with an empty search_path. The
-- primitives are building blocks for SCRUM-42's action routines; they are not
-- executable by anon/authenticated (see migration 5).

-- Append-only / immutability guards --------------------------------------------
create function app.reject_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% on %.% is not permitted: the table is append-only', tg_op, tg_table_schema, tg_table_name
    using errcode = '42501';
end $$;

create function app.reject_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'DELETE on %.% is not permitted: records are retained', tg_table_schema, tg_table_name
    using errcode = '42501';
end $$;

do $$
declare t text;
begin
  -- Fully immutable (insert-only), including TRUNCATE.
  foreach t in array array['policy_versions','import_batches','collections','ledger_postings',
                           'decisions','audit_events','run_events'] loop
    execute format('create trigger %I before update or delete on public.%I for each row execute function app.reject_mutation()', t || '_immutable', t);
    execute format('create trigger %I before truncate on public.%I for each statement execute function app.reject_mutation()', t || '_no_truncate', t);
  end loop;
  -- Mutable only through routines, never deletable.
  foreach t in array array['workspaces','workspace_members','profiles','cases','reconciliation_runs','ledger_allocations','submissions'] loop
    execute format('create trigger %I before delete on public.%I for each row execute function app.reject_delete()', t || '_no_delete', t);
    execute format('create trigger %I before truncate on public.%I for each statement execute function app.reject_delete()', t || '_no_truncate', t);
  end loop;
end $$;

-- Audit timestamps are server-assigned; a caller cannot backdate an event.
create function app.stamp_audit_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.occurred_at := clock_timestamp();
  return new;
end $$;
create trigger audit_events_stamp before insert on public.audit_events
  for each row execute function app.stamp_audit_event();

-- Source rows may only join an accepted batch of the matching kind.
create function app.check_batch_kind() returns trigger
language plpgsql set search_path = '' as $$
declare b public.import_batches;
begin
  select * into b from public.import_batches
   where workspace_id = new.workspace_id and id = new.import_batch_id;
  if b.status is distinct from 'accepted' or b.kind::text is distinct from tg_argv[0] then
    raise exception 'import batch % must be an accepted % batch', new.import_batch_id, tg_argv[0]
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger collections_batch_kind before insert on public.collections
  for each row execute function app.check_batch_kind('collection');
create trigger ledger_postings_batch_kind before insert on public.ledger_postings
  for each row execute function app.check_batch_kind('ledger');

-- Cases: identity columns are fixed; version only moves forward by one.
create function app.guard_case_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.workspace_id <> old.workspace_id or new.collection_id <> old.collection_id
     or new.creator_id is distinct from old.creator_id or new.created_at <> old.created_at then
    raise exception 'case identity columns are immutable' using errcode = '42501';
  end if;
  if new.version <> old.version and new.version <> old.version + 1 then
    raise exception 'case version must advance by exactly one (% -> %)', old.version, new.version
      using errcode = 'OL409';
  end if;
  return new;
end $$;
create trigger cases_guard_update before update on public.cases
  for each row execute function app.guard_case_update();

-- Attachment references -------------------------------------------------------------
-- evidence_ids holds attachment UUIDs only, all belonging to the same case.
create function app.check_evidence_ids() returns trigger
language plpgsql set search_path = '' as $$
declare found_count integer; wanted integer;
begin
  if cardinality(new.evidence_ids) = 0 then return new; end if;
  select count(distinct x) into wanted from unnest(new.evidence_ids) as x;
  select count(*) into found_count from public.evidence e
   where e.workspace_id = new.workspace_id and e.case_id = new.case_id and e.id = any (new.evidence_ids);
  if found_count <> wanted or array_position(new.evidence_ids, null) is not null then
    raise exception 'evidence_ids must reference attachments of the same case' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger case_drafts_evidence_ids before insert or update on public.case_drafts
  for each row execute function app.check_evidence_ids();
create trigger submissions_evidence_ids before insert on public.submissions
  for each row execute function app.check_evidence_ids();

-- Evidence cannot be silently replaced or deleted once it is referenced.
create function app.guard_evidence_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'evidence metadata is immutable; upload a new attachment instead' using errcode = '42501';
  end if;
  if exists (select 1 from public.submissions s where s.workspace_id = old.workspace_id and old.id = any (s.evidence_ids))
     or exists (select 1 from public.case_drafts d where d.workspace_id = old.workspace_id and old.id = any (d.evidence_ids)) then
    raise exception 'evidence % is referenced and cannot be deleted', old.id using errcode = '42501';
  end if;
  return old;
end $$;
create trigger evidence_guard before update or delete on public.evidence
  for each row execute function app.guard_evidence_change();

-- Submissions: the source snapshot is captured by the database, not the caller.
create function app.capture_submission_snapshot() returns trigger
language plpgsql set search_path = '' as $$
declare col public.collections; led public.ledger_postings; snap jsonb;
begin
  select c.* into col from public.cases k
    join public.collections c on c.workspace_id = k.workspace_id and c.id = k.collection_id
   where k.workspace_id = new.workspace_id and k.id = new.case_id;
  if not found then
    raise exception 'case % not found for submission', new.case_id using errcode = 'OL404';
  end if;
  snap := jsonb_build_object(
    'schemaVersion', 1,
    'collection', jsonb_build_object('id', col.id, 'sourceRecordId', col.source_record_id, 'sourceHash', col.source_hash),
    'proposedLedger', null);
  if new.proposed_ledger_id is not null then
    select * into led from public.ledger_postings
     where workspace_id = new.workspace_id and id = new.proposed_ledger_id;
    snap := snap || jsonb_build_object('proposedLedger',
      jsonb_build_object('id', led.id, 'sourceRecordId', led.source_record_id, 'sourceHash', led.source_hash));
  end if;
  -- Caller-supplied keys are kept, but the captured keys always win.
  new.source_snapshot := coalesce(new.source_snapshot, '{}'::jsonb) || snap;
  return new;
end $$;
create trigger submissions_snapshot before insert on public.submissions
  for each row execute function app.capture_submission_snapshot();

-- Only the lifecycle status of a submission may change after insert.
create function app.guard_submission_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'submissions are immutable apart from status' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger submissions_guard_update before update on public.submissions
  for each row execute function app.guard_submission_update();

-- Allocations may only be released, once.
create function app.guard_allocation_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.released_at is not null
     or (to_jsonb(new) - 'released_at') is distinct from (to_jsonb(old) - 'released_at') then
    raise exception 'an allocation can only be released, once' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger ledger_allocations_guard_update before update on public.ledger_allocations
  for each row execute function app.guard_allocation_update();

-- Runs: completed/failed are terminal.
create function app.guard_run_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status in ('completed', 'failed') then
    raise exception 'a % run is terminal', old.status using errcode = '42501';
  end if;
  if new.id <> old.id or new.workspace_id <> old.workspace_id or new.rule_version <> old.rule_version
     or new.input_snapshot is distinct from old.input_snapshot then
    raise exception 'run identity, rule version and input snapshot are immutable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger reconciliation_runs_guard_update before update on public.reconciliation_runs
  for each row execute function app.guard_run_update();

-- Idempotency: a committed row always carries its outcome ---------------------------------
create function app.guard_idempotency_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'pending'
     or (to_jsonb(new) - 'status' - 'result_json') is distinct from (to_jsonb(old) - 'status' - 'result_json') then
    raise exception 'idempotency rows only move from pending to an outcome, once' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger idempotency_guard_update before update on public.idempotency_requests
  for each row execute function app.guard_idempotency_update();
create trigger idempotency_no_delete before delete on public.idempotency_requests
  for each row execute function app.reject_delete();

create function app.assert_idempotency_resolved() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Deferred triggers may see the row as queued, so re-read its current state.
  if exists (select 1 from public.idempotency_requests i
              where i.workspace_id = new.workspace_id and i.user_id = new.user_id
                and i.action = new.action and i.key = new.key and i.status = 'pending') then
    raise exception 'idempotency request % was committed without an outcome', new.key using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger idempotency_resolved_at_commit
  after insert or update on public.idempotency_requests
  deferrable initially deferred
  for each row execute function app.assert_idempotency_resolved();

-- Transaction primitives ------------------------------------------------------------------
-- 1. Version lock (optimistic concurrency + row lock).
create function app.lock_case(p_workspace_id uuid, p_case_id uuid, p_expected_version integer)
returns public.cases
language plpgsql set search_path = '' as $$
declare c public.cases;
begin
  select * into c from public.cases
   where id = p_case_id and workspace_id = p_workspace_id for update;
  if not found then
    raise exception 'case % not found in workspace %', p_case_id, p_workspace_id using errcode = 'OL404';
  end if;
  if p_expected_version is not null and c.version <> p_expected_version then
    raise exception 'case version conflict' using errcode = 'OL409',
      detail = format('expected version %s, current version %s', p_expected_version, c.version);
  end if;
  return c;
end $$;

create function app.bump_case_version(p_workspace_id uuid, p_case_id uuid)
returns integer
language plpgsql set search_path = '' as $$
declare v integer;
begin
  update public.cases set version = version + 1
   where id = p_case_id and workspace_id = p_workspace_id
   returning version into v;
  if v is null then
    raise exception 'case % not found in workspace %', p_case_id, p_workspace_id using errcode = 'OL404';
  end if;
  return v;
end $$;

-- 2. Idempotency. Call first inside the action transaction; if replayed is true,
--    return result_json instead of repeating the work. Finish with idempotency_complete.
create function app.idempotency_begin(
  p_workspace_id uuid, p_user_id uuid, p_action text, p_key text, p_resource_id uuid, p_payload_hash text)
returns table (replayed boolean, status public.idempotency_status, result_json jsonb)
language plpgsql set search_path = '' as $$
declare r public.idempotency_requests;
begin
  insert into public.idempotency_requests (workspace_id, user_id, action, key, resource_id, payload_hash)
  values (p_workspace_id, p_user_id, p_action, p_key, p_resource_id, p_payload_hash)
  on conflict (workspace_id, user_id, action, key) do nothing
  returning * into r;
  if found then
    return query select false, r.status, r.result_json;
    return;
  end if;
  select * into r from public.idempotency_requests i
   where i.workspace_id = p_workspace_id and i.user_id = p_user_id and i.action = p_action and i.key = p_key;
  if r.payload_hash <> p_payload_hash or r.resource_id <> p_resource_id then
    raise exception 'idempotency key reused with a different request' using errcode = 'OL422';
  end if;
  return query select true, r.status, r.result_json;
end $$;

create function app.idempotency_complete(
  p_workspace_id uuid, p_user_id uuid, p_action text, p_key text,
  p_status public.idempotency_status, p_result jsonb)
returns void
language plpgsql set search_path = '' as $$
begin
  if p_status = 'pending' then
    raise exception 'complete with succeeded or rejected' using errcode = '22023';
  end if;
  update public.idempotency_requests
     set status = p_status, result_json = p_result
   where workspace_id = p_workspace_id and user_id = p_user_id and action = p_action and key = p_key;
  if not found then
    raise exception 'idempotency request not found; call idempotency_begin first' using errcode = 'OL404';
  end if;
end $$;

-- 3. Append-only audit insertion.
create function app.append_audit(
  p_workspace_id uuid, p_event_type text, p_actor_kind public.actor_kind, p_actor_user_id uuid,
  p_case_id uuid default null, p_request_id text default null, p_run_id uuid default null,
  p_submission_id uuid default null, p_decision_id uuid default null, p_import_batch_id uuid default null,
  p_case_version integer default null, p_payload jsonb default '{}'::jsonb)
returns uuid
language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.audit_events (workspace_id, case_id, event_type, actor_kind, actor_user_id, request_id,
                                   run_id, submission_id, decision_id, import_batch_id, case_version, payload)
  values (p_workspace_id, p_case_id, p_event_type, p_actor_kind, p_actor_user_id, p_request_id,
          p_run_id, p_submission_id, p_decision_id, p_import_batch_id, p_case_version,
          jsonb_build_object('schemaVersion', 1) || coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- 4. Allocation claim: the partial unique indexes are the arbiter, so two
--    concurrent claims on one ledger posting cannot both commit.
create function app.allocate_ledger(
  p_workspace_id uuid, p_case_id uuid, p_ledger_id uuid, p_decision_id uuid, p_run_id uuid)
returns uuid
language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.ledger_allocations (workspace_id, case_id, ledger_id, decision_id, run_id)
  values (p_workspace_id, p_case_id, p_ledger_id, p_decision_id, p_run_id)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'ledger posting or case already has an active allocation' using errcode = 'OL409',
    detail = format('ledger %s, case %s', p_ledger_id, p_case_id);
end $$;

create function app.release_allocation(p_workspace_id uuid, p_allocation_id uuid)
returns void
language plpgsql set search_path = '' as $$
begin
  update public.ledger_allocations set released_at = clock_timestamp()
   where id = p_allocation_id and workspace_id = p_workspace_id and released_at is null;
  if not found then
    raise exception 'no active allocation %', p_allocation_id using errcode = 'OL404';
  end if;
end $$;
