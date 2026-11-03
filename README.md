# Proofline

Proofline is a local prototype for the **Intelligent Automation** track. It compares synthetic collection records with synthetic ledger postings, automatically matches records that pass every policy rule, and routes exceptions to a reviewer. A visual investigation playback explains each step.

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

1. **Overview:** Review the batch summary. Three of eight synthetic collections match automatically; five require action or additional evidence. Select **Run check again** to watch the batch playback.
2. **Duplicate reference:** Select **Watch investigation** on case `COL-1012`. Two ledger postings share the same reference and amount. The policy gate blocks automatic closure. Inspect the four playback steps and their checklists.
3. **Reviewer decision:** Open `COL-1013` from **Cases**. Its recorded fee explains the amount difference. Set **Act as** to **Reviewer**, select the ledger posting, enter a reason of at least eight characters, and record the reviewed match.
4. **Later evidence:** On **Sources & rules**, select **Receive sample file**, then **Run reconciliation**. The later ledger posting is processed and case `COL-1014` matches automatically.
5. **Audit:** Open **Activity** to inspect actions and export the CSV. Use **Sources & rules → Reset the entire demo** to clear reviewer decisions and return to the initial state.

Reviewer decisions and activity are stored in your browser's `localStorage`. They persist across refreshes in the same browser profile. Reset them from the app when repeating the demo.

## Matching policy

The editable policy is in [`src/rules.js`](src/rules.js). Every automatic rule must pass:

1. The collection reference identifies exactly one ledger posting.
2. The posting is a credit, not a reversal.
3. The currencies match.
4. The amounts match exactly.
5. The posting is within the configured time window.

The default posting window is **30 minutes for this demo**; it is not a universal banking standard. `RULE_SETTINGS` also controls nearby-candidate search, fee explanation tolerance, and which case categories allow a reviewed match. The matching logic is in [`src/engine.js`](src/engine.js). The broader investigation controls and their implementation status are documented in [`BANKING_RULE_CRITERIA.md`](BANKING_RULE_CRITERIA.md).

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
