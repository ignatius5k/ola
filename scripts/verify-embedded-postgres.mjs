// Disposable PostgreSQL + pgTAP fallback for hosts without Docker.
// Auth and Storage use the same shim as the plain-Postgres runner; this does
// not exercise Supabase services, network concurrency, or the real Auth API.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgtap } from '@electric-sql/pglite-pgtap';
import { ROLE, WORKFLOW_STATUS } from '../shared/domain.js';
import { AUTOMATION_POLICY_VERSION, RULE_SETTINGS } from '../src/rules.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const db = await PGlite.create({ extensions: { pgtap } });
const report = ['SCRUM-39 integration: disposable embedded PostgreSQL with Auth/Storage shim',
  'This is SQL verification, not a full Supabase service or concurrent-session test.'];
let assertionCount = 0;
let stage = 'bootstrap';

async function verifyLegacyUpgrade(migrations) {
  const upgrade = await PGlite.create();
  try {
    await upgrade.exec(await read('scripts/supabase-shim.sql'));
    const boundary = migrations.findIndex(name => name.endsWith('_align_project_contracts.sql'));
    assert.ok(boundary > 0, 'Compatibility migration must follow the imported foundation');
    for (const file of migrations.slice(0, boundary)) await upgrade.exec(await read(`supabase/migrations/${file}`));
    await upgrade.exec(`
      insert into public.workspaces (id,name,active_rule_version)
        values ('39000000-0000-4000-8000-000000000001','Upgrade fixture','demo-1');
      insert into public.import_batches (id,workspace_id,source_system,origin,kind)
        values ('39000000-0000-4000-8000-000000000002','39000000-0000-4000-8000-000000000001','upgrade','seed','collection');
      insert into public.collections (id,workspace_id,import_batch_id,source_system,source_record_id,reference,counterparty,amount_minor,currency,recorded_at,channel,source_hash,raw_payload)
        select md5('upgrade-col-'||n)::uuid,'39000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000002',
          'upgrade','UP-'||n,'REF-'||n,'Synthetic upgrade',100,'SGD','2026-10-23T09:00:00Z','Test',repeat('a',64),'{}'
        from generate_series(1,4) n;
      insert into public.cases (id,workspace_id,collection_id,workflow_status)
        select md5('upgrade-case-'||n)::uuid,'39000000-0000-4000-8000-000000000001',md5('upgrade-col-'||n)::uuid,
          (array['new','needs_review','submitted','reviewed_match'])[n] from generate_series(1,4) n;
    `);
    const before = (await upgrade.query('select * from public.collections order by id')).rows;
    const oldPolicy = (await upgrade.query("select * from public.policy_versions where version='demo-1'")).rows;
    for (const file of migrations.slice(boundary)) await upgrade.exec(await read(`supabase/migrations/${file}`));
    const { rows: cases } = await upgrade.query(`select c.workflow_status,c.version,a.case_version,
      a.payload->>'from' as old_status,a.payload->>'to' as new_status from public.cases c
      join public.audit_events a on a.case_id=c.id and a.event_type='case.workflow_contract_aligned' order by old_status`);
    assert.deepEqual(cases.map(row => [row.old_status,row.workflow_status,row.version,row.case_version,row.new_status]), [
      ['needs_review','open',2,2,'open'], ['new','open',2,2,'open'],
      ['reviewed_match','verified',2,2,'verified'], ['submitted','awaiting_review',2,2,'awaiting_review']
    ]);
    assert.deepEqual((await upgrade.query('select * from public.collections order by id')).rows, before);
    assert.deepEqual((await upgrade.query("select * from public.policy_versions where version='demo-1'")).rows, oldPolicy);
    assert.equal((await upgrade.query('select active_rule_version from public.workspaces')).rows[0].active_rule_version, 'demo-1');
    report.push('Legacy upgrade: canonical status mapping, incremented versions, per-case audit, immutable sources/history, retained workspace policy: PASS');
    console.log('Legacy database upgrade and retained history: passed');
  } finally { await upgrade.close(); }
}

try {
  const { rows: [version] } = await db.query('select version() as version');
  report.push(version.version);
  await db.exec('create extension if not exists pgtap;');
  await db.exec(await read('scripts/supabase-shim.sql'));
  const migrations = (await readdir(new URL('supabase/migrations/', root))).filter(name => name.endsWith('.sql')).sort();
  stage = 'legacy migration upgrade';
  await verifyLegacyUpgrade(migrations);
  for (const file of migrations) {
    stage = `migration ${file}`;
    await db.exec(await read(`supabase/migrations/${file}`));
    report.push(`Applied ${file}`);
  }
  stage = 'seed';
  await db.exec(await read('supabase/seed.sql'));
  stage = 'shared contract parity';
  const { rows: [roleRow] } = await db.query('select enum_range(null::public.member_role)::text[] as roles');
  assert.deepEqual(roleRow.roles.sort(), Object.values(ROLE).sort());
  const { rows: [policy] } = await db.query(`select p.version, p.settings from public.workspaces w
    join public.policy_versions p on p.version=w.active_rule_version where w.name='Ola Demo'`);
  assert.equal(policy.version, AUTOMATION_POLICY_VERSION);
  assert.deepEqual(policy.settings, RULE_SETTINGS);
  const { rows: [seedStatus] } = await db.query('select bool_and(workflow_status=$1) as valid from public.cases', [WORKFLOW_STATUS.OPEN]);
  assert.equal(seedStatus.valid, true);
  await db.exec('begin;');
  for (const status of Object.values(WORKFLOW_STATUS)) {
    await db.query('update public.cases set workflow_status=$1 where id=(select id from public.cases limit 1)', [status]);
  }
  for (const status of ['new', 'needs_review', 'submitted', 'reviewed_match', 'unknown']) {
    await db.exec('savepoint invalid_state;');
    await assert.rejects(db.query('update public.cases set workflow_status=$1 where id=(select id from public.cases limit 1)', [status]), error => error.code === '23514');
    await db.exec('rollback to savepoint invalid_state;');
  }
  await db.exec("update public.cases set category='invalid' where id=(select id from public.cases limit 1); rollback;");
  report.push('Shared contract parity: roles, active policy/settings, open seed, all eight canonical states, legacy/unknown rejection, invalid evidence category: PASS');
  console.log('Shared role, workflow and policy contracts: passed');
  const tests = (await readdir(new URL('supabase/tests/database/', root))).filter(name => name.endsWith('.test.sql')).sort();
  for (const file of tests) {
    stage = `test ${file}`;
    const results = await db.exec(await read(`supabase/tests/database/${file}`));
    const lines = results.flatMap(result => result.rows.flatMap(row => Object.values(row)))
      .filter(value => typeof value === 'string').flatMap(value => value.split('\n'));
    const tap = lines.filter(line => /^(?:ok\b|not ok\b|1\.\.\d+|#|Bail out!)/.test(line));
    const failures = tap.filter(line => /^(?:not ok\b|Bail out!)/.test(line));
    const count = tap.filter(line => /^(?:ok|not ok)\b/.test(line)).length;
    const plans = tap.filter(line => /^1\.\.\d+/.test(line));
    report.push(`\n${file}`, ...tap);
    assert.equal(failures.length, 0, `${file}: ${failures.join('\n')}`);
    assert.equal(plans.length, 1, `${file}: expected exactly one TAP plan`);
    assert.equal(count, Number(plans[0].match(/^1\.\.(\d+)/)[1]), `${file}: incomplete TAP output`);
    assertionCount += count;
    process.stdout.write(`${file}: ${count} assertions passed\n`);
  }
  const { rows: [counts] } = await db.query(`select
    (select count(*)::int from public.collections) as collections,
    (select count(*)::int from public.ledger_postings) as ledger_postings,
    (select count(*)::int from public.cases) as cases,
    (select count(*)::int from public.audit_events) as audit_events`);
  report.push(`\nSeed counts: ${JSON.stringify(counts)}`, `PASS: ${assertionCount} assertions; ${migrations.length} migrations.`);
  console.log(`PASS: ${assertionCount} assertions; ${migrations.length} migrations.`, counts);
} catch (error) {
  report.push(`FAIL at ${stage}: ${error.message}`);
  console.error(`FAIL at ${stage}: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
  await mkdir(new URL('docs/evidence/', root), { recursive: true });
  const path = new URL('docs/evidence/database-embedded-output.txt', root);
  await writeFile(path, report.join('\n') + '\n');
  console.log(`Evidence: ${fileURLToPath(path)}`);
}
