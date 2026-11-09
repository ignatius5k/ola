# SCRUM-9: initial reconciliation automation boundaries

Status: tested prototype policy, 9 November 2026. This builds on the [SCRUM-37 architecture contract](architecture.md), [permissions contract](permissions.md), and canonical [role/status values](../shared/domain.js). The current app uses synthetic data and a browser role selector. This document proposes the first guarded rule set for the eventual authenticated service; it is not a production risk approval.

## Decision rule

Auto-close a collection only when **every** check passes under policy `SCRUM-9-v1`:

1. The collection and posting have valid positive amounts in cents, a valid nonnegative posting fee, and ISO timestamps with explicit offsets and real calendar dates.
2. Exactly one ledger posting has the same reference, and that posting is associated with no other collection.
3. The posting is a credit, has the same currency, exactly the same amount in cents, and no fee.
4. Its timestamp is at or after the collection timestamp and no more than 30 minutes later.
5. The currency has an approved human-verification threshold, and the collection amount is **below** it. The threshold is inclusive: an amount equal to it requires a reviewer.
6. No earlier reviewed decision has become stale because the evidence or policy changed.

If a check fails, the engine must not silently close the case. The current prototype uses SGD 10,000 and USD 10,000 as **demo thresholds**. There is no universal safe monetary threshold: a risk owner must set values by currency, product, exposure, fraud experience, and operational capacity using representative historical data. The 30-minute window is also provisional.

## Case disposition matrix

| Case type | Required evidence | Engine action and decision rule | Human approval point |
| --- | --- | --- | --- |
| Exact, low-value credit | Collection, unique exact-reference posting, currency/amount/fee/time, policy version, rule results | Auto-close only if all six checks pass; store posting allocation and audit snapshot | None for this narrow route; risk owner must first approve the active policy |
| Large transaction | Same evidence plus amount and configured currency threshold | Flag at or above threshold; never auto-close | Reviewer verifies amount, source, and posting and records a reason before closure |
| Explained fee | Unique exact-reference credit, source amount, posted amount, recorded fee, same currency and permitted time | Leave open when fee in cents exactly explains the difference | Reviewer confirms fee treatment and records a reason before a reviewed match |
| Reference discrepancy | One eligible nearby posting with exact amount/currency and permitted time; source reference evidence | Leave open; nearby value is a candidate, not proof of identity | Reviewer checks both references and records a reason before a reviewed match |
| Duplicate reference or ledger allocation conflict | All competing collections/postings, source identifiers | Block automatic and reviewed match until distinct evidence resolves ownership | Escalate; no prose override of a conflicting posting |
| Reversal, currency mismatch, unexplained amount | Original source, ledger rows, reversal/FX or amount investigation evidence | Block closure | Escalate to investigation; a new, valid evidence state is needed before matching |
| Timing outside window or posting before collection | Source timestamps and independently verified posting time | Block automatic match | Investigate timing; the current prototype cannot approve this category |
| Missing posting | Collection and processed-file inventory | Keep open; re-evaluate when a new file is processed | No approval until eligible posting evidence arrives |
| Invalid source or posting | Original source record and corrected authoritative record | Block matching | Escalate and correct source data |
| Missing or invalid threshold | Currency and policy configuration | Fail closed for automatic matching | Risk owner configures the threshold; reviewer cannot use the threshold absence to bypass policy |
| Prior approval with changed evidence or policy | Original approval and current source/posting/policy snapshots | Mark as needing re-verification; preserve the prior event | Reviewer repeats verification against current evidence |

The prototype reviewer path currently permits only one eligible candidate in the fee, reference, or high-value categories. It requires a reason of at least eight characters. Large transactions also require an explicit verification checkbox. Other categories are investigation or escalation routes, not discretionary match overrides. The SCRUM-37 [permissions contract](permissions.md) adds a required Analyst submission and an independent Reviewer who differs from the creator and submitter; the browser's direct demo-candidate approval is not that production workflow.

## Audit contract

Every automatic match, large-value flag, and reviewed decision records the collection and posting identifiers, original monetary values and timestamps, candidate IDs, case category, rule checks, policy version/settings, actor, action, reason where applicable, and event time. These snapshots remain visible on the case timeline and Activity page after a reviewed match; Activity exports them as JSON in CSV. Re-running a batch keeps prior decision events and records a re-verification event when approval evidence becomes stale.

The prototype stores this trail in `localStorage`, and its **Reset entire demo** control clears it. It is therefore inspectable only within the current browser state, not durable or tamper resistant. The production path in [architecture](architecture.md) requires authenticated distinct roles, an exclusive allocation enforced in a database transaction, server timestamps, append-only audit writes coupled to the decision, retention/access rules, and an export that includes closed cases. NIST SP 800-53 AU-3, AU-9 and AU-11 provide audit content, protection and retention guidance; the Basel Committee's operational risk guidance supports approval authority, segregation of duties and dual controls. Neither prescribes the demo's SGD/USD 10,000 threshold.

For the SCRUM-37 implementation sequence, SCRUM-41 should move the pure rule predicates into `shared/policy.js` and prove parity against these fixtures. SCRUM-39 and SCRUM-42 must enforce exclusive ledger allocation, a revalidation hold after reopening, and atomic decision/audit writes; SCRUM-48 completes durable query and export. Persist the canonical `WORKFLOW_STATUS` values from `shared/domain.js` in that service rather than the prototype's display labels. The current `src/engine.js` is not server authority.

## If AI runs the workflow

There is no OpenAI API call or OpenAI API key in the current code. The AI may retrieve and summarise source evidence, suggest a ledger candidate, request missing evidence, and invoke a constrained reconciliation action. Treat text in uploaded records as data, not instructions. The server must independently reload the current source, policy, role, case version and ledger allocation, run the deterministic checks above, and commit the outcome with its audit event in one transaction. AI output is an investigation aid, never proof that a rule passed or that a human approved. A blocked case remains blocked even when the AI proposes a match; Reviewer approval stays a separate authenticated human action under [permissions](permissions.md). If an OpenAI integration is added later, its secret key belongs in the protected server environment, never a `VITE_` browser variable.

## Backtesting and performance

The reproducible harness is [`scripts/backtest-automation.mjs`](../scripts/backtest-automation.mjs). It sweeps thresholds of 100, 500, 1,000, 5,000, 10,000 and 20,000 in SGD and USD; posting windows of 5, 15, 30 and 60 minutes; amount values immediately below, at and above a threshold, including values that round to the threshold in cents; timing before, at and after the window; and reversal, currency, amount, fee, reference, invalid timestamp and duplicate faults. Its independent oracle asserts that only an exact, below-threshold, in-window, defect-free credit auto-matches. It also compares indexed and scan-based classifications and checks that approvals survive a policy change as historical evidence while current status reopens.

On the 24-case synthetic fixture, a 30-minute window and the 10,000 demo thresholds auto-match seven cases and flag two for amount verification. The fixture has too few large or delayed cases to estimate real false-match rates, fraud loss, reviewer workload, or an optimal amount threshold. At the 10,000 threshold, 5 minutes closes five, 15 minutes closes six, and 60 minutes closes eight. Thresholds from 1,000 through 10,000 produce the same fixture counts; 20,000 auto-closes two more cases that would otherwise receive amount verification. Keep 30 minutes and 10,000 as transparent prototype defaults pending representative historical validation, not as an empirically optimal policy.

The ledger index maps exact references and amount/currency/time buckets, then uses a binary search for nearby candidates. It preserves candidate order and classifications while removing repeated full-ledger scans in the tested workload. The sustained backtest evidence is in [`automation-backtest-1h.json`](automation-backtest-1h.json) and the [final-rule run](automation-backtest-final.json). The latter measures both exact-reference and nearby-reference workloads. Benchmark numbers are synthetic Node timings, not a service latency target.

The initial timed run lasted 3,038 seconds (10:19:15–11:09:54 UTC), completed 102 cycles and 30,600 scenarios, and recorded zero safety failures. The final cached-time implementation ran concurrently for its last 1,020 seconds (10:52:54–11:09:54 UTC), completed 34 cycles and 10,200 scenarios, and also recorded zero failures. The [pre-precision](automation-backtest-preprecision.json) and [pre-cache](automation-backtest-precache.json) files preserve intermediate tuning evidence; their counts are not included in these two totals. Each scenario compares the independent safety oracle and the indexed versus scan classifications/candidate IDs.

| Final implementation workload | Samples | Scan median | Indexed median, including index build | Speedup |
| --- | ---: | ---: | ---: | ---: |
| 2,000 exact-reference pairs | 9 | 27.67 ms | 10.32 ms | 2.68× |
| 2,000 nearby-reference pairs | 10 | 106.72 ms | 9.66 ms | 11.05× |
| 5,000 exact-reference pairs | 1 | 275.92 ms | 30.21 ms | 9.13× (single sample) |

These results establish a useful lookup improvement for the synthetic workloads, not a latency guarantee. The current browser prototype still rebuilds the index for each case-list evaluation; the protected service should benchmark complete runs, database reads and writes, concurrent allocation, and audit persistence on representative data before adopting a performance target.

## Sources

- [Basel Committee, Principles for the Sound Management of Operational Risk](https://www.bis.org/committees/bcbs/basel-consolidated-guidelines/module/orr/10)
- [NIST SP 800-53 Rev. 5, AU-3, AU-9 and AU-11](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
