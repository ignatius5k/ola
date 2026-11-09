-- Database Foundation schema, constraint and primitive tests (pgTAP).
-- Run: npx supabase test db     (fixtures are self-contained and rolled back)
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
insert into public.import_batches (id, workspace_id, source_system, origin, kind) values
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','sys','seed','collection'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-0000000000a1','sys','seed','ledger'),
  ('c0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-0000000000b1','sys','seed','collection');
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


-- 1. Structure ---------------------------------------------------------------------------
select tables_are('public', array['policy_versions','workspaces','workspace_members','profiles','import_batches',
  'collections','ledger_postings','cases','case_drafts','evidence','submissions','decisions','ledger_allocations',
  'reconciliation_runs','run_events','audit_events','idempotency_requests'], 'exactly the expected public tables');
select col_is_pk('public','policy_versions','version','policy_versions PK is version');
select col_is_pk('public','workspace_members', array['workspace_id','user_id'], 'membership unique per workspace/user');
select col_is_unique('public','cases','collection_id','one case per collection');
select has_index('public','ledger_allocations','ledger_allocations_active_ledger_uidx','active-allocation-per-ledger index');
select has_index('public','ledger_allocations','ledger_allocations_active_case_uidx','active-allocation-per-case index');
select ok((select indexdef like '%WHERE (released_at IS NULL)%' from pg_indexes where indexname='ledger_allocations_active_ledger_uidx'), 'ledger index is partial on released_at IS NULL');
select ok((select count(*) = 0 from pg_constraint where connamespace='public'::regnamespace and contype='f' and not convalidated), 'all foreign keys validated');
select ok(not exists (
  select 1 from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace
   and c.conrelid::regclass::text not in ('workspaces','workspace_members','profiles','policy_versions')
   and c.confrelid::regclass::text not in ('workspaces','policy_versions','auth.users')
   and array_length(c.conkey,1) < 2), 'every cross-table FK among tenant tables is composite (workspace-scoped)');
select is((select count(*) from public.policy_versions where version='demo-1'), 1::bigint, 'initial policy version exists');

-- 2. Policy catalogue -------------------------------------------------------------------------
select throws_ok($$insert into public.policy_versions values ('bad-1','{"a":1}', repeat('0',64))$$, '23514', null, 'policy sha256 must match settings');
select throws_ok($$update public.policy_versions set settings = '{}'::jsonb where version='demo-1'$$, '42501', null, 'policy versions are immutable (even for the owner)');
select throws_ok($$delete from public.policy_versions where version='demo-1'$$, '42501', null, 'policy versions cannot be deleted');

-- 3. Money, currency and source constraints -------------------------------------------------------
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-Z0','R','C',0,'SGD',now(),'ch',repeat('a',64),'{}')$$, '23514', null, 'collection amount must be > 0');
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-Z1','R','C',9007199254740992,'SGD',now(),'ch',repeat('a',64),'{}')$$, '23514', null, 'amount above 2^53-1 rejected');
select lives_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-Z2','R','C',9007199254740991,'USD',now(),'ch',repeat('a',64),'{}')$$, 'amount of exactly 2^53-1 accepted');
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-Z3','R','C',100,'EUR',now(),'ch',repeat('a',64),'{}')$$, '22P02', null, 'currency limited to SGD/USD');
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000001','sys','COL-X1','R','C',100,'SGD',now(),'ch',repeat('a',64),'{}')$$, '23505', null, 'source row dedupe: unique(workspace, system, source_record_id)');
select lives_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000b1','c0000000-0000-4000-8000-000000000011','sys','COL-X1','R','C',100,'SGD',now(),'ch',repeat('a',64),'{}')$$, 'same source ID is allowed in a different workspace');
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000011','sys','COL-Z4','R','C',100,'SGD',now(),'ch',repeat('a',64),'{}')$$, '23514', null, 'a batch from another workspace is not visible to the insert (rejected)');
select throws_ok($$insert into public.collections (workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','COL-Z5','R','C',100,'SGD',now(),'ch',repeat('a',64),'{}')$$, '23514', null, 'collection cannot join a ledger batch');

select throws_ok($$insert into public.ledger_postings (workspace_id,import_batch_id,source_system,source_record_id,reference,amount_minor,currency,recorded_at,source_hash,raw_payload,posting_type)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-Z1','R',-1,'SGD',now(),repeat('a',64),'{}','credit')$$, '23514', null, 'credit amount must be >= 0');
select throws_ok($$insert into public.ledger_postings (workspace_id,import_batch_id,source_system,source_record_id,reference,amount_minor,currency,recorded_at,source_hash,raw_payload,posting_type)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-Z2','R',0,'SGD',now(),repeat('a',64),'{}','reversal')$$, '23514', null, 'reversal amount must be < 0');
select throws_ok($$insert into public.ledger_postings (workspace_id,import_batch_id,source_system,source_record_id,reference,amount_minor,currency,recorded_at,source_hash,raw_payload,posting_type,fee_minor)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-Z3','R',100,'SGD',now(),repeat('a',64),'{}','credit',-1)$$, '23514', null, 'fee_minor must be >= 0');
select throws_ok($$insert into public.ledger_postings (workspace_id,import_batch_id,source_system,source_record_id,reference,amount_minor,currency,recorded_at,source_hash,raw_payload,posting_type)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-Z4','R',-9007199254740992,'SGD',now(),repeat('a',64),'{}','reversal')$$, '23514', null, 'ledger magnitude capped at 2^53-1');
select lives_ok($$insert into public.ledger_postings (workspace_id,import_batch_id,source_system,source_record_id,reference,amount_minor,currency,recorded_at,source_hash,raw_payload,posting_type)
  values ('b0000000-0000-4000-8000-0000000000a1','c0000000-0000-4000-8000-000000000002','sys','LED-Z5','REF-1',12500,'SGD',now(),repeat('a',64),'{}','credit')$$, 'duplicate-reference scenario: a third posting may reuse reference REF-1 with a distinct source ID');
select is((select count(*) from public.ledger_postings where workspace_id = 'b0000000-0000-4000-8000-0000000000a1' and reference = 'REF-1'), 3::bigint, 'ledger reference is intentionally non-unique');
select throws_ok($$update public.collections set reference = 'changed' where source_record_id = 'COL-X1'$$, '42501', null, 'accepted collections never update in place');
select throws_ok($$delete from public.ledger_postings where source_record_id = 'LED-X1'$$, '42501', null, 'accepted ledger postings never delete');
select throws_ok($$truncate public.run_events$$, '42501', null, 'append-only tables cannot be truncated');
select throws_ok($$truncate public.collections$$, '0A000', null, 'referenced source tables cannot be truncated (FK) either');

-- 4. Import batch conventions -----------------------------------------------------------------------------
select throws_ok($$insert into public.import_batches (workspace_id,source_system,origin,kind,created_by) values ('b0000000-0000-4000-8000-0000000000a1','sys','csv_import','collection','aaaaaaaa-0000-4000-8000-000000000001')$$, '23514', null, 'user CSV import requires file_object_path and hash');
select throws_ok($$insert into public.import_batches (id,workspace_id,source_system,origin,kind,created_by,file_sha256,file_object_path)
  values ('c0000000-0000-4000-8000-0000000000f1','b0000000-0000-4000-8000-0000000000a1','sys','csv_import','collection','aaaaaaaa-0000-4000-8000-000000000001',repeat('a',64),'wrong/path.csv')$$, '23514', null, 'object path must be workspace/importUUID/original.csv');
select lives_ok($$insert into public.import_batches (id,workspace_id,source_system,origin,kind,created_by,file_sha256,file_object_path)
  values ('c0000000-0000-4000-8000-0000000000f2','b0000000-0000-4000-8000-0000000000a1','sys','csv_import','collection','aaaaaaaa-0000-4000-8000-000000000001',repeat('a',64),'b0000000-0000-4000-8000-0000000000a1/c0000000-0000-4000-8000-0000000000f2/original.csv')$$, 'conforming CSV import batch accepted');
select lives_ok($$insert into public.import_batches (workspace_id,source_system,origin,kind,created_by) values ('b0000000-0000-4000-8000-0000000000a1','sys','manual','collection','aaaaaaaa-0000-4000-8000-000000000001')$$, 'manual batch may omit file_object_path');
select throws_ok($$insert into public.import_batches (workspace_id,source_system,origin,kind,status) values ('b0000000-0000-4000-8000-0000000000a1','sys','seed','collection','rejected')$$, '23514', null, 'rejected batch needs an error summary');

-- 5. Cases, drafts, evidence ---------------------------------------------------------------------------------
select throws_ok($$insert into public.cases (workspace_id, collection_id) values ('b0000000-0000-4000-8000-0000000000a1','d0000000-0000-4000-8000-000000000001')$$, '23505', null, 'a collection has at most one case');
select lives_ok($$insert into public.collections (id,workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
  values ('d0000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-0000000000b1','c0000000-0000-4000-8000-000000000011','sys','COL-Y2','R','C',100,'SGD',now(),'ch',repeat('a',64),'{}')$$, 'a second, case-less collection in Y');
select throws_ok($$insert into public.cases (workspace_id, collection_id) values ('b0000000-0000-4000-8000-0000000000a1','d0000000-0000-4000-8000-000000000012')$$, '23503', null, 'case cannot adopt another workspace''s collection');
select throws_ok($$update public.cases set workflow_status = 'bogus' where id = 'f0000000-0000-4000-8000-000000000001'$$, '23514', null, 'workflow_status limited to the known list');
select throws_ok($$update public.cases set version = version + 2 where id = 'f0000000-0000-4000-8000-000000000001'$$, 'OL409', null, 'case version only advances by one');
select throws_ok($$update public.cases set creator_id = 'aaaaaaaa-0000-4000-8000-000000000001' where id = 'f0000000-0000-4000-8000-000000000001'$$, '42501', null, 'case creator_id is immutable');
select throws_ok($$delete from public.cases where id = 'f0000000-0000-4000-8000-000000000001'$$, '42501', null, 'cases are never deleted');
select throws_ok($$insert into public.evidence (id,workspace_id,case_id,object_path,sha256,content_type,size_bytes,uploaded_by)
  values (gen_random_uuid(),'b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','nope',repeat('a',64),'application/pdf',1,'aaaaaaaa-0000-4000-8000-000000000001')$$, '23514', null, 'evidence path convention enforced');
select throws_ok($$insert into public.evidence (id,workspace_id,case_id,object_path,sha256,content_type,size_bytes,uploaded_by)
  values ('f1000000-0000-4000-8000-0000000000a2','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1/f0000000-0000-4000-8000-000000000001/f1000000-0000-4000-8000-0000000000a2',repeat('a',64),'application/pdf',1,'aaaaaaaa-0000-4000-8000-000000000004')$$, '23503', null, 'uploader must be a member of the same workspace');
select throws_ok($$update public.evidence set size_bytes = 99 where id = 'f1000000-0000-4000-8000-000000000001'$$, '42501', null, 'evidence cannot be silently replaced');
select lives_ok($$insert into public.case_drafts (case_id,workspace_id,author_id,proposed_ledger_id,findings,evidence_ids)
  values ('f0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','draft','{f1000000-0000-4000-8000-000000000001}')$$, 'draft may reference its own attachments');
select throws_ok($$update public.case_drafts set evidence_ids = '{f1000000-0000-4000-8000-000000000011}' where case_id = 'f0000000-0000-4000-8000-000000000001'$$, '23503', null, 'draft cannot reference another workspace''s attachment');
select throws_ok($$delete from public.evidence where id = 'f1000000-0000-4000-8000-000000000001'$$, '42501', null, 'evidence referenced by a draft cannot be deleted');

-- 6. Submissions & decisions ------------------------------------------------------------------------------------
select lives_ok($$insert into public.submissions (id,workspace_id,case_id,submitted_by,case_version,rule_version,proposed_ledger_id,findings,evidence_ids)
  values ('51000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',1,'demo-1','e0000000-0000-4000-8000-000000000001','found it','{}')$$, 'submission with empty evidence_ids accepted');
select is((select source_snapshot->'collection'->>'sourceRecordId' from public.submissions where id='51000000-0000-4000-8000-000000000001'), 'COL-X1', 'collection id captured in source_snapshot automatically');
select is((select source_snapshot->'proposedLedger'->>'sourceHash' from public.submissions where id='51000000-0000-4000-8000-000000000001'), repeat('c',64), 'proposed ledger hash captured automatically');
select is((select source_snapshot->'collection'->>'sourceHash' from public.submissions where id='51000000-0000-4000-8000-000000000001'), repeat('a',64), 'collection hash captured automatically');
select lives_ok($$insert into public.submissions (id,workspace_id,case_id,submitted_by,case_version,rule_version,source_snapshot)
  values ('51000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',9,'demo-1','{"collection":{"sourceHash":"forged"}}')$$, 'caller-supplied snapshot accepted but...');
select is((select source_snapshot->'collection'->>'sourceHash' from public.submissions where id='51000000-0000-4000-8000-000000000009'), repeat('a',64), '...captured values override forged ones');
select throws_ok($$insert into public.submissions (workspace_id,case_id,submitted_by,case_version,rule_version) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',1,'demo-1')$$, '23505', null, 'one submission per case version');
select throws_ok($$insert into public.submissions (workspace_id,case_id,submitted_by,case_version,rule_version,evidence_ids)
  values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',2,'demo-1','{f1000000-0000-4000-8000-000000000011}')$$, '23503', null, 'submission evidence_ids must be same-case attachments');
select throws_ok($$insert into public.submissions (workspace_id,case_id,submitted_by,case_version,rule_version,evidence_ids)
  values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',3,'demo-1',ARRAY[gen_random_uuid()])$$, '23503', null, 'collection/ledger UUIDs are not valid evidence_ids');
select throws_ok($$update public.submissions set findings = 'edited' where id='51000000-0000-4000-8000-000000000001'$$, '42501', null, 'submission content is immutable');
select lives_ok($$update public.submissions set status = 'decided' where id='51000000-0000-4000-8000-000000000001'$$, 'submission status may advance');
select throws_ok($$delete from public.submissions where id='51000000-0000-4000-8000-000000000001'$$, '42501', null, 'submissions are never deleted');
select throws_ok($$delete from public.evidence where id='f1000000-0000-4000-8000-000000000001'$$, '42501', null, 'referenced evidence cannot be deleted');
select throws_ok($$insert into public.decisions (workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
  values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','reviewed_match','short','{}')$$, '23514', null, 'decision reason needs >= 8 characters');
select lives_ok($$insert into public.decisions (id,workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
  values ('d1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','reviewed_match','Fee explains difference','{}')$$, 'valid decision accepted');
select throws_ok($$insert into public.decisions (workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
  values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002','escalated','Second decision','{}')$$, '23505', null, 'one decision per submission');
select throws_ok($$update public.decisions set reason = 'rewritten history' where id='d1000000-0000-4000-8000-000000000001'$$, '42501', null, 'decisions are immutable');

-- 7. Allocations (rollback leaves no partial decision) ----------------------------------------------------------------
select lives_ok($$select app.allocate_ledger('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',null)$$, 'first active allocation succeeds');
select throws_ok($$select app.allocate_ledger('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',null)$$, 'OL409', null, 'second active allocation of one ledger posting conflicts');
select throws_ok($$select app.allocate_ledger('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',null)$$, 'OL409', null, 'second active allocation for one case conflicts');
select throws_ok($$insert into public.ledger_allocations (workspace_id,case_id,ledger_id,decision_id) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001')$$, '23505', null, 'raw insert hits the partial unique index too');
select throws_ok($$insert into public.ledger_allocations (workspace_id,case_id,ledger_id,decision_id) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001')$$, '23505', null, 'index arbitrates even outside the routine');
select throws_ok($$insert into public.ledger_allocations (workspace_id,case_id,ledger_id) values ('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002')$$, '23514', null, 'allocation needs a decision or run');
-- Atomic routine: decision + conflicting allocation in one statement block => nothing persists.
select lives_ok($$insert into public.submissions (id,workspace_id,case_id,submitted_by,case_version,rule_version) values ('51000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001',2,'demo-1')$$, 'second submission for rollback check');
select throws_ok($outer$do $b$ begin
    insert into public.decisions (id,workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
      values ('d1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000002','reviewed_match','Reviewer confirms','{}');
    perform app.allocate_ledger('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',null);
  end $b$$outer$, 'OL409', null, 'decision + conflicting allocation fails as one unit');
select is((select count(*) from public.decisions where id='d1000000-0000-4000-8000-000000000002'), 0::bigint, 'no partial decision left behind');
select lives_ok($$select app.release_allocation('b0000000-0000-4000-8000-0000000000a1', (select id from public.ledger_allocations where released_at is null and workspace_id='b0000000-0000-4000-8000-0000000000a1'))$$, 'allocation can be released');
select lives_ok($$select app.allocate_ledger('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',null)$$, 'after release the case may be allocated again');
select throws_ok($$update public.ledger_allocations set ledger_id = 'e0000000-0000-4000-8000-000000000001' where released_at is null$$, '42501', null, 'allocation may only be released, never re-pointed');

-- 8. Runs, run events ---------------------------------------------------------------------------------------------------
select lives_ok($$insert into public.reconciliation_runs (id,workspace_id,actor_id,rule_version,status) values ('a1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','demo-1','running')$$, 'run created');
select lives_ok($$insert into public.run_events (workspace_id,run_id,sequence,case_id,stage) values ('b0000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001',1,'f0000000-0000-4000-8000-000000000001','candidates')$$, 'run event recorded');
select throws_ok($$insert into public.run_events (workspace_id,run_id,sequence,stage) values ('b0000000-0000-4000-8000-0000000000a1','a1000000-0000-4000-8000-000000000001',1,'dup')$$, '23505', null, 'unique(run_id, sequence)');
select throws_ok($$update public.reconciliation_runs set status='completed' where id='a1000000-0000-4000-8000-000000000001'$$, '23514', null, 'completed run needs completed_at');
select lives_ok($$update public.reconciliation_runs set status='completed', completed_at=now() where id='a1000000-0000-4000-8000-000000000001'$$, 'run completes');
select throws_ok($$update public.reconciliation_runs set status='running' where id='a1000000-0000-4000-8000-000000000001'$$, '42501', null, 'completed run is terminal');
select throws_ok($$update public.run_events set stage='x' where sequence=1$$, '42501', null, 'run events are append-only');

-- 9. Audit --------------------------------------------------------------------------------------------------------------------
select throws_ok($$insert into public.audit_events (workspace_id,event_type,actor_kind,payload) values ('b0000000-0000-4000-8000-0000000000a1','x','user','{"schemaVersion":1}')$$, '23514', null, 'user events need actor_user_id');
select lives_ok($$insert into public.audit_events (workspace_id,event_type,actor_kind,payload) values ('b0000000-0000-4000-8000-0000000000a1','system.x','system','{"schemaVersion":1}')$$, 'system events may omit actor_user_id');
select throws_ok($$insert into public.audit_events (workspace_id,event_type,actor_kind,payload) values ('b0000000-0000-4000-8000-0000000000a1','x','system','{}')$$, '23514', null, 'payload requires schemaVersion');
select lives_ok($$insert into public.audit_events (workspace_id,event_type,actor_kind,occurred_at,payload) values ('b0000000-0000-4000-8000-0000000000a1','backdated','system','2000-01-01','{"schemaVersion":1}')$$, 'backdated insert accepted...');
select ok((select occurred_at > now() - interval '1 hour' from public.audit_events where event_type='backdated'), '...but occurred_at is stamped by the server');
select throws_ok($$update public.audit_events set event_type = 'rewritten'$$, '42501', null, 'audit rows cannot be updated');
select throws_ok($$delete from public.audit_events$$, '42501', null, 'audit rows cannot be deleted');
select throws_ok($$truncate public.audit_events$$, '42501', null, 'audit table cannot be truncated');
select is((select payload->>'schemaVersion' from public.audit_events where event_type='test.event' and workspace_id='b0000000-0000-4000-8000-0000000000a1'), '1', 'append_audit adds schemaVersion');

-- 10. Primitives: version lock & idempotency -----------------------------------------------------------------------------
select lives_ok($$select app.lock_case('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001',1)$$, 'lock_case with current version');
select throws_ok($$select app.lock_case('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001',7)$$, 'OL409', null, 'lock_case detects version conflict');
select throws_ok($$select app.lock_case('b0000000-0000-4000-8000-0000000000b1','f0000000-0000-4000-8000-000000000001',1)$$, 'OL404', null, 'lock_case cannot see a case through another workspace');
select is((select app.bump_case_version('b0000000-0000-4000-8000-0000000000a1','f0000000-0000-4000-8000-000000000001')), 2, 'bump_case_version advances by one');
select lives_ok($$select * from app.idempotency_begin('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','submit','key-0000001','51000000-0000-4000-8000-000000000001',repeat('a',64))$$, 'idempotency_begin first call');
select is((select replayed from app.idempotency_begin('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','submit','key-0000001','51000000-0000-4000-8000-000000000001',repeat('a',64))), true, 'same request replays');
select throws_ok($$select * from app.idempotency_begin('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','submit','key-0000001','51000000-0000-4000-8000-000000000001',repeat('b',64))$$, 'OL422', null, 'same key + different payload rejected');
select throws_ok($$set constraints idempotency_resolved_at_commit immediate$$, '23514', null, 'a pending request cannot commit without an outcome');
select lives_ok($$select app.idempotency_complete('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','submit','key-0000001','succeeded','{"ok":true}')$$, 'idempotency_complete records the outcome');
select is((select result_json->>'ok' from app.idempotency_begin('b0000000-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-000000000001','submit','key-0000001','51000000-0000-4000-8000-000000000001',repeat('a',64))), 'true', 'replay returns the committed outcome');
select throws_ok($$update public.idempotency_requests set payload_hash = repeat('c',64)$$, '42501', null, 'idempotency identity is immutable');

-- 11. Security posture (concrete controls for the advisor review) ----------------------------------------------------------------
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relkind='r' and not c.relrowsecurity), 0::bigint, 'RLS enabled on every public table');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname in ('public','app') and p.prosecdef and not coalesce(p.proconfig::text like '%search_path=%', false)), 0::bigint, 'every SECURITY DEFINER function pins search_path');
select is((select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname in ('public','app') and p.prosecdef), array['has_workspace_role','member_workspace_ids'], 'the only SECURITY DEFINER routines are the two membership helpers');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname in ('public','app') and not p.proname like any (array['member_workspace_ids','has_workspace_role'])
              and has_function_privilege('authenticated', p.oid, 'execute')
              and p.prokind='f' and n.nspname='app'), 0::bigint, 'authenticated cannot execute transaction primitives');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='app' and has_function_privilege('anon', p.oid, 'execute')), 0::bigint, 'anon cannot execute any app routine');
select is((select count(*) from information_schema.role_table_grants
            where table_schema='public' and grantee='anon'), 0::bigint, 'anon holds no table privileges');
select is((select count(*) from information_schema.role_table_grants
            where table_schema='public' and grantee='authenticated' and privilege_type <> 'SELECT'), 0::bigint, 'authenticated holds SELECT only');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relkind='v' and c.relname like '%\_read' and not coalesce(c.reloptions::text like '%security_invoker=true%', false)), 0::bigint, 'every public view is security_invoker');

select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relkind='v' and c.relname like '%\_read'), 4::bigint, 'the four *_read views exist');

select * from finish();
rollback;
