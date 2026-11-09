-- Same-workspace references must also belong to the same case.
begin;
select plan(9);
create temporary table history_fixture as
select w.id as ws,
  (select id from public.cases where workspace_id=w.id order by id limit 1) as case_a,
  (select id from public.cases where workspace_id=w.id order by id offset 1 limit 1) as case_b,
  (select id from public.ledger_postings where workspace_id=w.id order by id limit 1) as ledger,
  (select user_id from public.workspace_members where workspace_id=w.id and role='analyst') as analyst,
  (select user_id from public.workspace_members where workspace_id=w.id and role='reviewer') as reviewer,
  gen_random_uuid() as submission, gen_random_uuid() as decision, gen_random_uuid() as run
from public.workspaces w where name='Ola Demo';

insert into public.submissions (id,workspace_id,case_id,submitted_by,case_version,rule_version)
select submission,ws,case_a,analyst,1,'SCRUM-9-v1' from history_fixture;

select throws_ok(format($q$insert into public.decisions (workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
  values (%L,%L,%L,%L,'reviewed_match','Checked source evidence','{}')$q$,ws,case_b,submission,reviewer),
  '23503',null,'decision cannot refer to a submission for another case') from history_fixture;
select throws_ok(format($q$update public.cases set last_submission_id=%L where id=%L$q$,submission,case_b),
  '23503',null,'last submission must belong to its case') from history_fixture;
select lives_ok(format($q$update public.cases set last_submission_id=%L where id=%L$q$,submission,case_a),
  'same-case last submission accepted') from history_fixture;
select lives_ok(format($q$insert into public.decisions (id,workspace_id,case_id,submission_id,reviewer_id,outcome,reason,snapshot)
  values (%L,%L,%L,%L,%L,'reviewed_match','Checked source evidence','{}')$q$,decision,ws,case_a,submission,reviewer),
  'same-case decision accepted') from history_fixture;

insert into public.reconciliation_runs (id,workspace_id,rule_version) select run,ws,'SCRUM-9-v1' from history_fixture;
select throws_ok(format($q$insert into public.ledger_allocations (workspace_id,case_id,ledger_id,decision_id)
  values (%L,%L,%L,%L)$q$,ws,case_b,ledger,decision),
  '23503',null,'allocation cannot cite another case decision') from history_fixture;
select throws_ok(format($q$insert into public.ledger_allocations (workspace_id,case_id,ledger_id,decision_id,run_id)
  values (%L,%L,%L,%L,%L)$q$,ws,case_a,ledger,decision,run),
  '23514',null,'allocation cannot have both a decision and a run') from history_fixture;
select throws_ok(format($q$insert into public.ledger_allocations (workspace_id,case_id,ledger_id)
  values (%L,%L,%L)$q$,ws,case_a,ledger),
  '23514',null,'allocation cannot omit its origin') from history_fixture;
select lives_ok(format($q$select app.allocate_ledger(%L,%L,%L,%L,null)$q$,ws,case_a,ledger,decision),
  'same-case decision can allocate its posting') from history_fixture;
select throws_ok(format($q$select app.allocate_ledger(%L,%L,%L,null,%L)$q$,ws,case_b,ledger,run),
  'OL409',null,'another case cannot claim the allocated posting') from history_fixture;
select * from finish();
rollback;
