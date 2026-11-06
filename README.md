# Match

Match is a local prototype for the **Intelligent Automation** track. It compares synthetic collection records with synthetic ledger postings, automatically matches records that pass every policy rule, and routes exceptions to a reviewer. A visual investigation playback explains each step.

**This is a demo.** It uses no customer data, bank connection, deployed AI agents, or real ledger posting. The role selector illustrates a reviewer workflow; it is not authentication or access control.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
git clone https://github.com/ignatius5k/proofline.git
cd proofline
npm ci
npm run dev -- --port 8766
```

Open [http://127.0.0.1:8766/](http://127.0.0.1:8766/). Stop the server with `Ctrl+C`. If port 8766 is occupied, choose another port in the command and open that address instead.

For a local production build:

```bash
npm run build
npm run preview -- --port 8766
```

Run the matching-engine tests with `npm test`.

## Demo walkthrough

1. **Home:** Review the batch summary. Seven of 24 synthetic collections match automatically; 17 require review or additional evidence. Select **Run check again** to watch the batch playback.
2. **Duplicate reference:** Open `COL-1012` from **Transactions** and select **Run investigation**. Two ledger postings share the same reference and amount. The policy gate blocks automatic closure. Inspect the four playback steps and their checklists; use **Pause**, **Resume**, and **Replay** to control the investigation.
3. **Reviewer decision:** Open `COL-1013` from **Transactions**. Its recorded fee explains the amount difference. Set the role in the top bar to **Reviewer**, select the ledger posting, and enter a reason of at least eight characters. The persistent bottom bar displays **Ready for approval** and enables **Approve match** when every required input is complete. Approval records the internal **Reviewed match** status, displayed as **Verified** in the interface.
4. **Later evidence:** On **Sources & rules → Data sources**, select **Receive sample file**, then **Run reconciliation**. The later ledger posting is processed and case `COL-1014` matches automatically.
5. **Audit:** Open **Activity** to inspect actions and export the CSV. Use **Sources & rules → Data sources → Reset the entire demo** to clear reviewer decisions and return to the initial state.

Each case now includes **Monitoring & guardrails** below the investigation playback. It shows the task context, a risk tier, the enforced closure route, and the rule results. Running the investigation records the viewed case, candidates, checks, and outcome in Activity. In the demo Reviewer role, a coach can add an observation at the bottom of the panel; the note is saved as an audit event and included in the CSV export. These are observable decision summaries and reviewer annotations, not private model reasoning or verified OCBC staff notes.

The contextual **Back** button returns to the originating Home, Transactions, Reviews, or Activity page. It restores the list search, filters, selected rows, and scroll position.

Reviewer decisions and activity are stored in your browser's `localStorage`. They persist across refreshes in the same browser profile. Reset them from the app when repeating the demo.

## Matching policy

The editable policy is in [`src/rules.js`](src/rules.js). Every automatic rule must pass:

1. The collection reference identifies exactly one ledger posting.
2. The posting is a credit, not a reversal.
3. The currencies match.
4. The amounts match exactly.
5. The posting is within the configured time window.
6. The amount is below the configured human verification threshold for its currency.

The default posting window is **30 minutes for this demo**; it is not a universal banking standard. `RULE_SETTINGS` also controls nearby-candidate search, fee explanation tolerance, which case categories allow a reviewed match, and the per-currency large transaction thresholds. The matching logic is in [`src/engine.js`](src/engine.js). The broader investigation controls and their implementation status are documented in [`BANKING_RULE_CRITERIA.md`](BANKING_RULE_CRITERIA.md).

## Large transaction verification

Transactions **at or above SGD 10,000 or USD 10,000** are flagged for human verification under the demo policy. Configure these inclusive thresholds in `RULE_SETTINGS.largeTransactionThresholds` in `src/rules.js`. Currencies without a valid configured threshold cannot close automatically. These values are demo settings, not regulatory reporting thresholds.

To demonstrate the flow:

1. Open **Reviews → Large transactions** and select `COL-1019` (SGD 12,500) or `COL-1031` (SGD 15,000).
2. In the top bar, choose **Reviewer**. Select the ledger posting and enter a reason of at least eight characters.
3. Select the checkbox confirming that the amount, source record, and ledger posting were verified. The persistent bottom bar displays **Ready for approval** and enables **Approve match** after the role, posting, reason, and checkbox requirements are complete. Approval records **Reviewed match**, displays the **Verified** badge, and removes the case from the open review queue.
4. Review the case activity or **Activity** for the amount, threshold, posting ID, actor, and reason. Rerunning reconciliation preserves the decision. Reopening the case restores the verification requirement.

The amount flag does not override duplicate, reversal, currency, amount, or timing exceptions. Those cases retain their existing evidence requirements. The browser role selector demonstrates this flow; production access control requires a server.

## Interface references

The shared shell and page layouts follow Stripe web screens inspected through Mobbin: [Home](https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf), [Transactions](https://mobbin.com/screens/f706524f-2964-47a5-ba06-4fdf75779e0f), [payment details](https://mobbin.com/screens/c3813cc0-16e8-45ef-8633-f21fe4f16652), and [events](https://mobbin.com/screens/ccbba4ee-5f88-4652-b4d7-1b9e7d7438fd). The interface uses Match's own synthetic records and policy. `src/stripe.css` contains the shared styling, `src/approval.css` contains the persistent review form and action bar, and `src/playback.css` contains the investigation and batch playback styling.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/main.jsx` | Pages, navigation, reviewer actions, and activity export. |
| `src/AgentStage.jsx` | Four-step case investigation playback. |
| `src/BatchPlayback.jsx` | Batch reconciliation playback. |
| `src/rules.js` | Code-editable matching criteria and settings. |
| `src/engine.js` | Pure reconciliation and case-state logic. |
| `src/engine.test.js` | Matching and decision-preservation tests. |
| `src/data.js` | Synthetic case and ledger records. |
| `public/mock-data/` | Downloadable sample CSV files. |

## Limits and evidence

The app does not import arbitrary files. The sample CSVs are inspectable inputs for the scenario; the case records are defined in `src/data.js`. The investigation animation displays rule results and simulated specialist steps. It does not execute an agent swarm.

The scenario is grounded in [OCBC OneCollect's transaction and exception reporting](https://www.ocbc.com/business-banking/help-and-support/payment-collection-transactions/one-collect.page), [Swift's discussion of payment exceptions and investigations](https://www.swift.com/standards/iso-20022/supercharge-your-payments-business/chapter-6), and public [ISO 20022 sample messages](https://developer.gs.com/docs/services/transaction-banking/iso20022samples/). The cases and values are invented. No frequency, savings, or performance claim in the demo is measured from OCBC operations.

For production use, the system would need authenticated source connectors, data validation, enforced role-based access, durable audit storage, operational monitoring, and bank-approved policy review.
