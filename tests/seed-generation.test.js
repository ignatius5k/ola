import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { collections, originalLedger, laterLedger } from '../src/data.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SEED_PATH = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url));
const generator = ['scripts/generate-seed.mjs', '--print-seed'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const utc = value => new Date(value).toISOString();

function runGenerator() {
  const result = spawnSync(process.execPath, generator, {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('seed generation is byte deterministic and contains no placeholder identities', () => {
  const first = runGenerator();
  const second = runGenerator();

  assert.equal(first, second);
  assert.equal(first, readFileSync(SEED_PATH, 'utf8'));
  assert.doesNotMatch(first, /insert into auth\.users/i);
  assert.doesNotMatch(first, /insert into public\.(profiles|workspace_members)/i);
  assert.doesNotMatch(first, /bootstrap-(analyst|reviewer)@ola\.local/i);
});

test('every generated source row carries the canonical hash of current UTF-8 data', () => {
  const seed = runGenerator();

  for (const item of collections) {
    const amountMinor = String(Math.round(item.amount * 100));
    const expected = sha256(JSON.stringify({
      system: 'synthetic-collections',
      id: item.id,
      reference: item.reference,
      counterparty: item.counterparty,
      amountMinor,
      currency: item.currency,
      recordedAt: utc(item.time),
      channel: item.channel
    }));
    const row = seed.split('\n').find(line => line.includes(`'${item.id}'`));

    assert.ok(row, `generated row exists for ${item.id}`);
    assert.ok(row.includes(`'${item.counterparty.replaceAll("'", "''")}'`));
    assert.ok(row.includes(`'${expected}'`), `${item.id} has its canonical hash`);
  }

  for (const item of [...originalLedger, laterLedger]) {
    const amountMinor = String(Math.round(item.amount * 100));
    const feeMinor = String(Math.round(item.fee * 100));
    const expected = sha256(JSON.stringify({
      system: 'synthetic-ledger',
      id: item.id,
      reference: item.reference,
      amountMinor,
      feeMinor,
      currency: item.currency,
      recordedAt: utc(item.time),
      postingType: item.type
    }));
    const row = seed.split('\n').find(line => line.includes(`'${item.id}'`));

    assert.ok(row, `generated row exists for ${item.id}`);
    assert.ok(row.includes(`'${expected}'`), `${item.id} has its canonical hash`);
  }

  assert.match(seed, /East Coast Café/);
  assert.doesNotMatch(seed, /East Coast CafÃ©/);
});
