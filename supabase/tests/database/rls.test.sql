-- Database Foundation RLS / permission tests (pgTAP): unauthenticated, Analyst, Reviewer, inactive,
-- outsider and cross-workspace cases. Fixtures are self-contained and rolled back.
-- Run: npx supabase test db
begin;
select no_plan();

-- Fixtures: two workspaces (X, Y) independent of the seed. Runs as the table owner.
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-0000-4000-8000-000000000001','authenticated','authenticated','ax@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000002','authenticated','authenticated','rx@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000003','authenticated','authenticated','ix@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000004','authenticated','authenticated','ay@test.local'),
  ('aaaaaaaa-0000-4000-8000-000000000005','authenticated','authenticated','out@test.local');
insert into public.workspaces (id, name, active_rule_version) values
  ('b0000000-0000-4000-8000-0000000000a1','Workspace X','demo-1'),
  ('b0000000-0000-4000-8000-0000000000b1','Workspace Y','demo-1');
insert into public.workspace_members (workspace_id, user_id, role, active) values
  ('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','analyst',true),
  ('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000002','reviewer',true),
  ('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000003','analyst',false),
  ('b0000000-0000-4000-8000-0000000000b1','aaaaaaaa-0000-4000-8000-000000000004','analyst',true);
insert into public.profiles (user_id, display_name) values
  ('aaaaaaaa-0000-4000-8000-000000000001','Analyst X'),('aaaaaaaa-0000-4000-8000-000000000004','Analyst Y');
insert into public.import_batches (id, workspace_id, source_system, origin, kind, file_object_path) values
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','sys','seed','collection','b0000000-0000-4000-8000-0000000000a1/c0000000-0000-4000-8000-000000000001/original.csv'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-0000000000a1','sys','seed','ledger',null),
  ('c0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-0000000000b1','sys','seed','collection','b0000000-0000-4000-8000-0000000000b1/c0000000-0000-4000-8000-000000000011/original.csv');
insert into public.collections (id, workspace_id, import_batch_id, source_system, source_record_id, reference, counterparty, amount_minor, currency, recorded_at, channel, source_hash, raw_payload) values
  ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-X1','REF-1','Acme',12500,'SGD','2026-10-23T09:00:00+08','PayNow QR',repeat('a',64),'{}'),
  ('d0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-0000000000b1','c0000000-0000-4000-8000-000000000011','sys','COL-Y1','REF-9','Globex',9900,'SGD','2026-10-23T09:00:00+08','PayNow QR',repeat('b',64),'{}');
insert into public.ledger_postings (id, workspace_id, import_batch_id, source_system, source_record_id, reference, amount_minor, currency, recorded_at, source_hash, raw_payload, posting_type, fee_minor) values
  ('e0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-X1','REF-1',12500,'SGD','2026-10-23T09:05:00+08',repeat('c',64),'{}','credit',0),
  ('e0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-X2','REF-1',12500,'SGD','2026-10-23T09:06:00+08',repeat('d',64),'{}','credit',0);
insert into public.cases (id, workspace_id, collection_id, creator_id) values
  ('f0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','d0000000-0000-4000-8000-000000000001',null),
  ('f0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-0000000000b1','d0000000-0000-4000-8000-000000000011',null);
insert into public.evidence (id, workspace_id, case_id, object_path, sha256, content_type, size_bytes, uploaded_by) values
  ('f1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-000000000001',repeat('e',64),'application/pdf',10,'aaaaaaaa-0000-4000-8000-000000000001'),
  ('f1000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-0000000000b1','f0000000-0000-4000-8000-000000000011',
   'b0000000-0000-4000-8000-0000000000b1/f0000000-0000-4000-8000-000000000011/f1000000-0000-4000-8000-000000000011',repeat('f',64),'application/pdf',10,'aaaaaaaa-0000-4000-8000-000000000004');
do $$ begin
  perform app.append_audit('b0000000-0000-4000-8000-0000000000a1','test.event','user','aaaaaaaa-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001');
  perform app.append_audit('b0000000-0000-4000-8000-0000000000b1','test.event','user','aaaaaaaa-0000-4000-8000-000000000004','f0000000-0000-4000-8000-000000000011');
end $$;


-- Helper (rolled back with the test): true when a statement is denied (privilege/RLS error) or affects 0 rows.
create function public.tap_blocked(q text) returns boolean language plpgsql as $$
declare n bigint;
begin
  execute q; get diagnostics n = row_count; return n = 0;
exception when insufficient_privilege then return true;
          when others then raise notice 'unexpected error for %: %', q, sqlerrm; return null;
end $$;
-- Storage fixtures (as owner).
insert into storage.objects (bucket_id, name) values
  ('evidence', 'b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-000000000001'),
  ('evidence', 'b0000000-0000-4000-8000-0000000000b1/f0000000-0000-4000-8000-000000000011/f1000000-0000-4000-8000-000000000011'),
  ('originals','b0000000-0000-4000-8000-0000000000a1/c0000000-0000-4000-8000-000000000001/original.csv'),
  ('originals','b0000000-0000-4000-8000-0000000000b1/c0000000-0000-4000-8000-000000000011/original.csv'),
  ('originals','b0000000-0000-4000-8000-0000000000a1/c0000000-0000-4000-8000-0000000000f2/original.csv'),
  ('evidence','b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-0000000000f2');

-- 1. Unauthenticated (anon) -------------------------------------------------------------------------
reset role; set local role anon;
select throws_ok($$select count(*) from public.workspaces$$, '42501', null, 'anon cannot read workspaces');
select throws_ok($$select count(*) from public.collections$$, '42501', null, 'anon cannot read collections');
select throws_ok($$select count(*) from public.cases$$, '42501', null, 'anon cannot read cases');
select throws_ok($$select count(*) from public.audit_events$$, '42501', null, 'anon cannot read audit_events');
select throws_ok($$select count(*) from public.evidence$$, '42501', null, 'anon cannot read evidence');
select throws_ok($$select count(*) from public.workspace_members$$, '42501', null, 'anon cannot read workspace_members');
select throws_ok($$select count(*) from public.collection_read$$, '42501', null, 'anon cannot read collection_read');
select throws_ok($$select * from app.member_workspace_ids()$$, '42501', null, 'anon cannot reach app helpers');
select is(public.tap_blocked($q$insert into public.workspaces (name, active_rule_version) values ('evil','demo-1')$q$), true, 'anon cannot create a workspace');
select is(public.tap_blocked($q$select * from storage.objects where bucket_id='evidence'$q$), true, 'anon sees no storage objects (denied or RLS-filtered)');

-- authenticated non-member ---------------------------------------------------------------
reset role; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.import_batches where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no import_batches rows of workspace X');
select is((select count(*) from public.collections where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no collections rows of workspace X');
select is((select count(*) from public.ledger_postings where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no ledger_postings rows of workspace X');
select is((select count(*) from public.cases where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no cases rows of workspace X');
select is((select count(*) from public.case_drafts where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no case_drafts rows of workspace X');
select is((select count(*) from public.evidence where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no evidence rows of workspace X');
select is((select count(*) from public.submissions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no submissions rows of workspace X');
select is((select count(*) from public.decisions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no decisions rows of workspace X');
select is((select count(*) from public.ledger_allocations where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no ledger_allocations rows of workspace X');
select is((select count(*) from public.reconciliation_runs where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no reconciliation_runs rows of workspace X');
select is((select count(*) from public.run_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no run_events rows of workspace X');
select is((select count(*) from public.audit_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no audit_events rows of workspace X');
select is((select count(*) from public.workspace_members where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'authenticated non-member sees no workspace_members rows of workspace X');
select is((select count(*) from public.workspaces)::int, 0, 'authenticated non-member sees no workspaces');
select is((select count(*) from storage.objects)::int, 0, 'authenticated non-member sees no storage objects');

-- inactive member of X ---------------------------------------------------------------
reset role; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.import_batches where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no import_batches rows of workspace X');
select is((select count(*) from public.collections where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no collections rows of workspace X');
select is((select count(*) from public.ledger_postings where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no ledger_postings rows of workspace X');
select is((select count(*) from public.cases where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no cases rows of workspace X');
select is((select count(*) from public.case_drafts where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no case_drafts rows of workspace X');
select is((select count(*) from public.evidence where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no evidence rows of workspace X');
select is((select count(*) from public.submissions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no submissions rows of workspace X');
select is((select count(*) from public.decisions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no decisions rows of workspace X');
select is((select count(*) from public.ledger_allocations where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no ledger_allocations rows of workspace X');
select is((select count(*) from public.reconciliation_runs where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no reconciliation_runs rows of workspace X');
select is((select count(*) from public.run_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no run_events rows of workspace X');
select is((select count(*) from public.audit_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no audit_events rows of workspace X');
select is((select count(*) from public.workspace_members where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'inactive member of X sees no workspace_members rows of workspace X');
select is((select count(*) from public.workspaces)::int, 0, 'inactive member of X sees no workspaces');
select is((select count(*) from storage.objects)::int, 0, 'inactive member of X sees no storage objects');

-- Analyst X ----------------------------------------------------------------------
reset role; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.import_batches where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 2, 'analyst X reads their import_batches');
select is((select count(*) from public.import_batches where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B import_batches disclosed');
select is((select count(*) from public.collections where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 1, 'analyst X reads their collections');
select is((select count(*) from public.collections where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B collections disclosed');
select is((select count(*) from public.ledger_postings where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 2, 'analyst X reads their ledger_postings');
select is((select count(*) from public.ledger_postings where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B ledger_postings disclosed');
select is((select count(*) from public.cases where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 1, 'analyst X reads their cases');
select is((select count(*) from public.cases where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B cases disclosed');
select is((select count(*) from public.case_drafts where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their case_drafts');
select is((select count(*) from public.case_drafts where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B case_drafts disclosed');
select is((select count(*) from public.evidence where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 1, 'analyst X reads their evidence');
select is((select count(*) from public.evidence where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B evidence disclosed');
select is((select count(*) from public.submissions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their submissions');
select is((select count(*) from public.submissions where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B submissions disclosed');
select is((select count(*) from public.decisions where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their decisions');
select is((select count(*) from public.decisions where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B decisions disclosed');
select is((select count(*) from public.ledger_allocations where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their ledger_allocations');
select is((select count(*) from public.ledger_allocations where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B ledger_allocations disclosed');
select is((select count(*) from public.reconciliation_runs where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their reconciliation_runs');
select is((select count(*) from public.reconciliation_runs where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B reconciliation_runs disclosed');
select is((select count(*) from public.run_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst X reads their run_events');
select is((select count(*) from public.run_events where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B run_events disclosed');
select is((select count(*) from public.audit_events where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 1, 'analyst X reads their audit_events');
select is((select count(*) from public.audit_events where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B audit_events disclosed');
select is((select count(*) from public.workspace_members where workspace_id = 'b0000000-0000-4000-8000-0000000000a1')::int, 3, 'analyst X reads their workspace_members');
select is((select count(*) from public.workspace_members where workspace_id = 'b0000000-0000-4000-8000-0000000000b1')::int, 0, 'workspace A credentials: no workspace B workspace_members disclosed');
select is((select count(*) from public.workspaces)::int, 1, 'analyst X sees only workspace X');
select is((select id::text from public.workspaces), 'b0000000-0000-4000-8000-0000000000a1', 'and it is workspace X');
select ok((select count(*) from public.policy_versions) >= 1, 'policy catalogue readable');
select is((select count(*) from public.profiles)::int, 1, 'profiles: own display name only (colleague profiles are not in X; Y profile hidden)');
select is((select count(*) from public.collection_read where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 1, 'collection_read honours RLS');
select is((select count(*) from public.collection_read where workspace_id='b0000000-0000-4000-8000-0000000000b1')::int, 0, 'collection_read hides workspace Y');
select is((select pg_typeof(amount_minor)::text from public.collection_read limit 1), 'text', 'amountMinor is serialised as a string');
select is((select amount_minor from public.collection_read where source_record_id='COL-X1'), '12500', 'amount_minor value');
select is((select total_minor from public.collection_totals_read where workspace_id='b0000000-0000-4000-8000-0000000000a1'), '12500', 'aggregate totals are integer strings');
select is((select count(*) from public.collection_totals_read where workspace_id='b0000000-0000-4000-8000-0000000000b1')::int, 0, 'totals hide workspace Y');
select is((select count(*) from app.member_workspace_ids())::int, 1, 'membership helper returns only the caller''s workspaces');
select is(app.has_workspace_role('b0000000-0000-4000-8000-0000000000a1', array['analyst']::public.member_role[]), true, 'has_workspace_role true for own role');
select is(app.has_workspace_role('b0000000-0000-4000-8000-0000000000a1', array['reviewer']::public.member_role[]), false, 'has_workspace_role false for other role');
select is(app.has_workspace_role('b0000000-0000-4000-8000-0000000000b1', array['analyst']::public.member_role[]), false, 'has_workspace_role false for another workspace');
select throws_ok($$select app.lock_case('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001',1)$$, '42501', null, 'authenticated cannot call transaction primitives');
select throws_ok($$select app.append_audit('b0000000-0000-4000-8000-0000000000a1','forged','system',null)$$, '42501', null, 'authenticated cannot forge audit events through the primitive');
select is(public.tap_blocked($q$update public.workspace_members set role='reviewer' where user_id='aaaaaaaa-0000-4000-8000-000000000001'$q$), true, 'membership escalation: own role update denied');
select is(public.tap_blocked($q$update public.workspace_members set active=true where user_id='aaaaaaaa-0000-4000-8000-000000000003'$q$), true, 'cannot reactivate a member');
select is(public.tap_blocked($q$insert into public.workspace_members (workspace_id,user_id,role) values ('b0000000-0000-4000-8000-0000000000b1','aaaaaaaa-0000-4000-8000-000000000001','reviewer')$q$), true, 'cannot add self to workspace Y');
select is(public.tap_blocked($q$insert into public.workspace_members (workspace_id,user_id,role) values ('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000005','reviewer')$q$), true, 'cannot add a member to own workspace');
select is(public.tap_blocked($q$delete from public.workspace_members$q$), true, 'cannot remove members');
select is(public.tap_blocked($q$update public.workspaces set active_rule_version='demo-1'$q$), true, 'cannot change active rule version');
select is(public.tap_blocked($q$update public.policy_versions set settings='{}'::jsonb$q$), true, 'cannot change policy settings');
select is(public.tap_blocked($q$insert into public.policy_versions values ('x','{}',repeat('0',64))$q$), true, 'cannot add policy versions');
select is(public.tap_blocked($q$update public.audit_events set event_type='rewritten'$q$), true, 'audit rewrite denied');
select is(public.tap_blocked($q$delete from public.audit_events$q$), true, 'audit delete denied');
select is(public.tap_blocked($q$insert into public.audit_events (workspace_id,event_type,actor_kind,actor_user_id,payload) values ('b0000000-0000-4000-8000-0000000000a1','forged','user','aaaaaaaa-0000-4000-8000-000000000001','{"schemaVersion":1}')$q$), true, 'direct audit insert denied');
select is(public.tap_blocked($q$update public.collections set amount_minor = 1$q$), true, 'source rewrite denied (collections)');
select is(public.tap_blocked($q$delete from public.collections$q$), true, 'source delete denied (collections)');
select is(public.tap_blocked($q$update public.ledger_postings set amount_minor = 1$q$), true, 'source rewrite denied (ledger)');
select is(public.tap_blocked($q$delete from public.ledger_postings$q$), true, 'source delete denied (ledger)');
select is(public.tap_blocked($q$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload) values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-HACK','R','C',1,'SGD',now(),'c',repeat('a',64),'{}')$q$), true, 'direct source insert denied');
select is(public.tap_blocked($q$update public.cases set workflow_status='reviewed_match' where id='f0000000-0000-4000-8000-000000000001'$q$), true, 'direct workflow write denied');
select is(public.tap_blocked($q$update public.cases set workflow_status='reviewed_match' where id='f0000000-0000-4000-8000-000000000011'$q$), true, 'cannot mutate workspace Y case');
select is(public.tap_blocked($q$insert into public.decisions (workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001',gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000001','reviewed_match','long enough','{}')$q$), true, 'direct decision insert denied');
select is(public.tap_blocked($q$insert into public.ledger_allocations (workspace_id,case_id,ledger_id,run_id) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001',null)$q$), true, 'direct allocation write denied');
select is(public.tap_blocked($q$insert into public.evidence (id,workspace_id,case_id,object_path,sha256,content_type,size_bytes,uploaded_by) values (gen_random_uuid(),'b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','x',repeat('a',64),'a/b',1,'aaaaaaaa-0000-4000-8000-000000000001')$q$), true, 'direct evidence metadata insert denied');
select is(public.tap_blocked($q$delete from public.evidence$q$), true, 'evidence delete denied');
select is(public.tap_blocked($q$select count(*) from public.idempotency_requests$q$), true, 'idempotency table is not client readable');
select is(public.tap_blocked($q$insert into public.idempotency_requests (workspace_id,user_id,action,key,resource_id,payload_hash,status,result_json) values ('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','a','12345678','f0000000-0000-4000-8000-000000000001',repeat('a',64),'succeeded','{}')$q$), true, 'idempotency table is not client writable');

-- Storage as analyst X
select lives_ok($$insert into storage.objects (bucket_id, name) values ('evidence','b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-0000000000aa')$$, 'analyst may upload evidence for an own-workspace case');
select is(public.tap_blocked($q$insert into storage.objects (bucket_id, name) values ('evidence','b0000000-0000-4000-8000-0000000000b1/f0000000-0000-4000-8000-000000000011/f1000000-0000-4000-8000-0000000000ab')$q$), true, 'cannot upload evidence into workspace Y');
select is(public.tap_blocked($q$insert into storage.objects (bucket_id, name) values ('evidence','b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000011/f1000000-0000-4000-8000-0000000000ac')$q$), true, 'cannot upload evidence for a case outside the workspace');
select is(public.tap_blocked($q$insert into storage.objects (bucket_id, name) values ('evidence','not-a-valid-path')$q$), true, 'evidence path must follow workspace/case/object');
select is(public.tap_blocked($q$insert into storage.objects (bucket_id, name) values ('originals','b0000000-0000-4000-8000-0000000000a1/c0000000-0000-4000-8000-0000000000f9/original.csv')$q$), true, 'clients cannot write originals (server only)');
select is((select count(*) from storage.objects where bucket_id='originals' and name like 'b0000000-0000-4000-8000-0000000000b1/%')::int, 0, 'originals of workspace Y are not readable');
select is((select count(*) from storage.objects where bucket_id='originals' and name like 'b0000000-0000-4000-8000-0000000000a1/%')::int, 1, 'originals of workspace X are readable');
select is((select count(*) from storage.objects where name like '%0000000000f2%')::int, 0, 'same-workspace orphan originals and evidence are hidden');
select is((select count(*) from storage.objects where bucket_id='evidence' and name='b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-000000000001')::int, 1, 'attached evidence is readable');
select is(public.tap_blocked($q$update storage.objects set name = name || 'x' where bucket_id='evidence'$q$), true, 'objects cannot be overwritten/renamed by clients');
select is(public.tap_blocked($q$delete from storage.objects where bucket_id='evidence'$q$), true, 'objects cannot be deleted by clients');

-- Reviewer X ------------------------------------------------------------------------------------------
reset role; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.cases where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 1, 'reviewer reads workspace cases');
select is((select count(*) from public.cases where workspace_id='b0000000-0000-4000-8000-0000000000b1')::int, 0, 'reviewer cannot read workspace Y');
select is((select count(*) from public.audit_events where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 1, 'reviewer reads audit trail');
select is(public.tap_blocked($q$update public.workspace_members set role='analyst' where user_id='aaaaaaaa-0000-4000-8000-000000000002'$q$), true, 'reviewer cannot change own membership');
select is(public.tap_blocked($q$update public.cases set workflow_status='escalated'$q$), true, 'reviewer cannot write workflow state directly');
select is(public.tap_blocked($q$delete from public.audit_events$q$), true, 'reviewer cannot delete audit history');
select is(public.tap_blocked($q$insert into storage.objects (bucket_id, name) values ('evidence','b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-0000000000ad')$q$), true, 'reviewer cannot upload evidence (analyst-only)');

-- Analyst Y: symmetric isolation ----------------------------------------------------------------------------
reset role; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.collections)::int, 1, 'analyst Y sees exactly one collection');
select is((select count(*) from public.collections where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 0, 'analyst Y sees none of workspace X');
select is((select count(*) from public.audit_events where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 0, 'audit of X not disclosed to Y');
select is((select count(*) from public.evidence where workspace_id='b0000000-0000-4000-8000-0000000000a1')::int, 0, 'evidence of X not disclosed to Y');
select is((select count(*) from storage.objects where name like 'b0000000-0000-4000-8000-0000000000a1/%')::int, 0, 'storage of X not disclosed to Y');

-- service_role: bypasses RLS but not the append-only/immutability guards -----------------------------------
reset role; set local role service_role;
select is((select count(*) from public.collections where workspace_id in ('b0000000-0000-4000-8000-0000000000a1','b0000000-0000-4000-8000-0000000000b1'))::int, 2, 'service_role reads both workspaces (server-side only)');
select throws_ok($$update public.audit_events set event_type = 'x'$$, '42501', null, 'service_role cannot rewrite audit history');
select throws_ok($$delete from public.collections$$, '42501', null, 'service_role cannot delete source records');
select throws_ok($$update public.policy_versions set settings = '{}'::jsonb$$, '42501', null, 'service_role cannot change a policy version');
select lives_ok($$select app.append_audit('b0000000-0000-4000-8000-0000000000a1','service.ok','system',null)$$, 'service_role may use the audit primitive');

reset role;
select is((select count(*) from storage.buckets where public)::int, 0, 'no public buckets');
select is((select array_agg(id order by id) from storage.buckets where id in ('originals','evidence')), array['evidence','originals'], 'private originals and evidence buckets exist');
select * from finish();
rollback;
