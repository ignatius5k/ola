# Proposed investigation controls

These are design criteria for a bank-style reconciliation workflow, not a claim about any bank's internal policy. The current prototype implements only the controls marked **Demo**. Time limits and approval thresholds need an institution's policy owner to set them.

| Stage | Strict pass criteria | Failure action | Current status |
|---|---|---|---|
| 1. Intake | Approved source and batch ID; file integrity and schema validated; mandatory transaction ID, reference, amount, currency and timestamp present; no duplicate input row | Quarantine the file or case; do not search or close it | Synthetic file and required fields only; integrity and schema controls proposed |
| 2. Record finder | Search exact transaction reference first; keep all candidate ledger IDs; use amount, currency and time proximity only to surface candidates, never to authorize automatic matching | No candidate: await later file; multiple exact candidates: review | Demo |
| 3. Evidence checker | One exact reference; same currency; exact amount; credit rather than reversal; posting within configured window; any fee or FX difference separately evidenced | Fail any check: hold for reviewer or escalate | Demo |
| 4. Policy gate | Every automatic rule passes; candidate has not already been consumed by another collection; no existing manual decision is overwritten; action and rule version recorded | Block automatic closure; require authorized reviewer | First and third criteria partially implemented; consumption and rule version proposed |
| 5. Human decision | Reviewer has the required role and is independent of the preparer; selected candidate and evidence are visible; reason is recorded; higher-risk cases require second approval | Keep case open or escalate | UI role and reason are Demo only; true access control and dual approval proposed |
| 6. Audit and monitoring | Immutable event with actor, time, source IDs, rule version, before/after status and reason; alerts for stale or repeated exceptions | Alert operations and preserve the evidence | Browser audit is Demo only; immutable storage and monitoring proposed |

The demo's editable automatic policy is in [`src/rules.js`](src/rules.js). Every predicate in `AUTO_MATCH_RULES` must pass. `RULE_SETTINGS` holds the 30-minute posting window, 30-minute nearby-candidate search window, fee explanation tolerance and reviewer-eligible categories. The engine consumes these settings, and the Sources & rules page displays them. Run `npm test` after a change.

The 30-minute window is a **demo assumption**, not a banking standard. A real policy should define its window by payment rail, settlement cycle and source-file latency, with separate thresholds for exception age and escalation. Nearby candidates and explained fees are review aids, not automatic-match shortcuts.

Public grounding: [BCBS 239](https://www.bis.org/publ/bcbs239.pdf) on accurate, complete, timely and traceable data; [Swift payment identification](https://docs.developer.swift.com/docs/api-guides/payment-initiation-api/payment-initiation-api-reference) on end-to-end IDs for reconciliation; and the [Basel Core Principles](https://www.bis.org/committees/bcbs/basel-framework/standard/bcp?allChapters=true) on segregation of duties, internal controls and exception tracking. These sources support the control categories; the specific numeric thresholds above are design proposals.
