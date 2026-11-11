# SCRUM-11 — Matching rules and edge-case review

Checked 11 Nov 2026 against the synthetic Ola data and `src/engine.js`. Expected results follow the configured demo policy in `src/rules.js` (one exact reference, credit, same currency, exact amount, at most 30 minutes, and human review at or above SGD/USD 10,000). These are prototype assumptions, not verified OCBC operating rules.

| Scenario | Case / evidence | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| Duplicate ledger reference | COL-1012 / LED-5002 and LED-5003; COL-1026 / LED-5016 and LED-5017 | Block automatic match; require investigation | `duplicate`, `Needs review`, two candidates in each case | Pass |
| Delayed file | COL-1014 / LED-5009 | Await evidence before the later file is processed; match once a subsequent batch processes it | `missing`, `Awaiting evidence` → `auto`, `Auto matched`; one auto-match audit event after reruns | Pass |
| Posting beyond 30 minutes | COL-1021 / LED-5012 | Block automatic match | `timing`, `Needs review` | Pass |
| Recorded processing fee | COL-1013 / LED-5004; COL-1025 / LED-5015 | Explain the net difference, but require a Reviewer decision | `fee`, `Needs review` for both | Pass |
| Reversal | COL-1015 / LED-5005; COL-1028 / LED-5019 | Never close as a credit | `reversal`, `Needs review` for both | Pass |
| Reference discrepancy | COL-1018 / LED-5008; COL-1027 / LED-5018 | Suggest a candidate but block automatic matching | `reference`, `Needs review` for both | Pass |
| Conflicting ledger evidence | Manual SGD 55 collection and COL-1014 both find LED-5009 after the later file | Keep the original match; block the manual case from reusing the posting; log the conflict once | Original remains `Auto matched`; manual case becomes `ledger-conflict`, `Needs review`; reviewed match is rejected and one conflict audit event survives reruns | Pass |

`npm test` passed 23/23 tests, including the 20 matching-engine tests. `npm run build` and `npm run db:seed:check` passed. The checked-in seed was regenerated because it had drifted from the deterministic generator. Reviewer creation of manual collections was blocked in the engine and UI, with the role test updated.

No matching-rule defect was observed in these fixtures. The current engine is a synthetic, local-state prototype; authenticated backend reconciliation and its database-level evidence controls are covered by separate Ola issues and are not proven by this test run.
