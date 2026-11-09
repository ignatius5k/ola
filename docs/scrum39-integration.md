# SCRUM-39 local integration evidence

Source: teammate's `ryan` branch, commit `a54356c` (Implemented database foundation), imported on 9 November 2026. New database files and the dependency lockfile were copied into the current working tree; package scripts were combined with the existing 32-test suite. No commit, hosted migration or deployment was performed.

## Compatibility changes

- Retain the six upstream migrations. The CLI-generated compatibility migration is ordered at `20261109190001` after the teammate's existing `20261109190000` index migration.
- Use the canonical roles and eight case statuses from `shared/domain.js`; convert legacy case labels with a version increment and audit event. Add the engine's `invalid` evidence category.
- Add `SCRUM-9-v1` matching current `RULE_SETTINGS`, preserving historical `demo-1` and existing workspace policy choices. Fresh seed explicitly selects the current policy.
- Enforce same-case submission/decision/allocation references and exactly one allocation origin. Restrict Storage reads to objects attached to authorised import/evidence metadata.
- Configure the local project as `ola`, with the documented Vite URL at port 8766, an additional development callback at 5173, and public signup disabled for the invite-only contract.
- Add a disposable PostgreSQL/pgTAP runner for machines without Docker. The anonymous Storage assertion accepts either permission denial or no visible rows; neither permits data disclosure.

## Verification on this machine

`npm run db:verify:embedded` replays all seven migrations, seeds 24 collections, 25 ledger postings (24 initial plus one later), 24 open cases and three audit events. It passes **268 pgTAP assertions**: history 9, RLS 136, schema 114, seed 9. It also checks the stored policy against `src/rules.js`, role/status parity against `shared/domain.js`, all eight valid case states, rejection of legacy/unknown labels, and the invalid-evidence category.

A separate disposable database applies the six upstream migrations, creates all four legacy case states, then applies the compatibility migration. The replay verifies mapped states, incremented versions, per-case audit records, unchanged source rows, immutable old policy content, and retention of the existing workspace's policy choice.

Runtime: Supabase CLI **3.0.0**, PGlite **0.5.15** (PostgreSQL **18.6**), pgTAP extension package **0.0.16**. Dependencies are pinned in `package.json` and `package-lock.json`. Full SQL output: [database-embedded-output.txt](evidence/database-embedded-output.txt).

After integration, `npm test` passes all 32 JavaScript tests, `npm run build` passes, `git diff --check` reports no whitespace errors, and two seed regenerations produce byte-identical SQL/test files. The generated TypeScript baseline retains its data shapes; its changed relationship metadata is aligned with the compatibility migration. Regenerate it with `npm run db:types` on a full local Supabase stack before using generated relation inference in a connected client.

## Remaining gates

Docker, WSL and native PostgreSQL are unavailable here. The attempted `npm run db:start` failed with `DockerLifecycleInspectError` because neither Docker nor Podman is installed; see [local stack output](evidence/database-local-stack-output.txt). Embedded PostgreSQL uses the repository's Auth/Storage shim; it does not test real Supabase Auth, Storage HTTP access, PostgREST, Realtime, multiple simultaneous transactions, or the configured PostgreSQL 17 runtime. Run `npm run db:start`, `npm run db:reset`, `npm run db:test`, `npm run db:advisors` and `npm run db:types` on an isolated Docker-enabled local stack before calling the full stack verified. Upstream advisor captures in `docs/evidence/` are teammate evidence, not a new run against the compatibility migration.

SCRUM-38/40/41/42/45 still own lifecycle transitions, real identities, server reconciliation, action authorisation, reviewer independence, atomic business actions and proposal-ledger eligibility. The database foundation does not connect the browser's demo decisions to the database.
