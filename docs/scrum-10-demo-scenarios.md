# SCRUM-10 — Demo scenarios and assumptions

Prepared 12 Nov 2026 against `src/data.js`, `src/rules.js` and `src/engine.js` at commit `fc36373`. All records are synthetic. Outcomes below were produced by running the current engine, not written by hand.

## Use case

A business collects payments through OCBC OneCollect. The operations team compares the collection records with the bank ledger. A case is opened whenever the two do not agree. Clear one-to-one matches close by rule; everything else goes to a person.

The scenarios are grounded in OCBC’s published OneCollect documentation:

- OCBC OneCollect provides a daily collection CSV, plus transaction and exception reports the next day at 7:00 am SGT. ([OCBC OneCollect help](https://www.ocbc.com/business-banking/help-and-support/payment-collection-transactions/one-collect.page))
- For PayNow QR, the unique QR reference for each transaction is listed on the bank statement. (same source)

## The 24 demo collections

| Case | Business | Amount (SGD) | Channel | Scenario | Engine outcome (first ledger file) |
| --- | --- | ---: | --- | --- | --- |
| COL-1011 | Harbour Books | 125.00 | PayNow QR | Unique posting arrives 6 min later | Auto matched (LED-5001) |
| COL-1012 | East Coast Café | 80.00 | PayNow QR | Two postings share reference and amount | Needs review: duplicate |
| COL-1013 | Civic Supplies | 200.00 | Card | Ledger lower by a recorded fee | Needs review: fee |
| COL-1014 | North Garden | 55.00 | PayNow QR | Posting missing from first file | Awaiting evidence → Auto matched after the later file (LED-5009) |
| COL-1015 | River Pharmacy | 45.00 | Card | Reversal for the same reference | Needs review: reversal |
| COL-1016 | Westfield Studio | 145.00 | PayNow QR | Straightforward one-to-one match | Auto matched (LED-5006) |
| COL-1017 | Arbor Travel | 76.00 | Cross-border | Reference agrees, currency does not | Needs review: currency |
| COL-1018 | Marina Print | 320.00 | PayNow QR | Similar posting with a mistyped reference | Needs review: reference |
| COL-1019 | Summit Industrial | 12,500.00 | Bank transfer | Exact evidence, above the large-amount threshold | Needs review: large amount |
| COL-1020 | Orchard Florist | 28.50 | PayNow QR | Exact credit within 2 min | Auto matched (LED-5011) |
| COL-1021 | Meridian Tools | 640.00 | Bank transfer | Exact credit outside the 30-min window | Needs review: timing |
| COL-1022 | Saffron Market | 91.00 | PayNow QR | Short payment, no recorded fee | Needs review: amount |
| COL-1023 | Tanjong Hardware | 73.00 | Card | Overpayment | Needs review: amount |
| COL-1024 | Kallang Coffee | 19.90 | PayNow QR | No posting in either file | Awaiting evidence |
| COL-1025 | Beacon Stationery | 310.00 | Card | Net settlement explained by fee | Needs review: fee |
| COL-1026 | Clementi Bakery | 48.00 | PayNow QR | Duplicate posting | Needs review: duplicate |
| COL-1027 | Bayshore Crafts | 160.00 | PayNow QR | Transposed reference nearby | Needs review: reference |
| COL-1028 | Atlas Services | 250.00 | Bank transfer | Negative reversal entry | Needs review: reversal |
| COL-1029 | Pine Books | 42.00 | PayNow QR | Exact credit | Auto matched (LED-5020) |
| COL-1030 | Cobalt Travel | 118.00 | Cross-border | Currency mismatch | Needs review: currency |
| COL-1031 | North Quay Trading | 15,000.00 | Bank transfer | Exact evidence, above the large-amount threshold | Needs review: large amount |
| COL-1032 | Holland Grocer | 39.50 | PayNow QR | Exact credit | Auto matched (LED-5023) |
| COL-1033 | Fern Pharmacy | 87.00 | PayNow QR | Boundary: posts exactly 30 min later | Auto matched (LED-5024) |
| COL-1034 | Sunset Printworks | 132.00 | PayNow QR | Exact credit | Auto matched (LED-5025) |

Totals for the first ledger file: 7 auto matched, 15 need review, 2 awaiting evidence. After the later file is processed, COL-1014 also matches automatically.

## Scenarios used in the pitch (SCRUM-13)

| Story beat | Case | Expected status | Expected audit event |
| --- | --- | --- | --- |
| Clear one-to-one match | COL-1016 | Auto matched | “Auto matched — Matched LED-5006. All automatic matching rules passed.” |
| Ambiguous duplicate | COL-1012 | Needs review; policy gate blocks closure | Investigation viewed and recorded in Activity |
| Large-amount verification | COL-1019 | Needs review → Reviewed match (shown as Verified) after reviewer approval | “Large transaction flagged”, then the reviewer’s decision with posting and reason |
| Later evidence | COL-1014 | Awaiting evidence → Auto matched | “Auto matched — New ledger file supplied LED-5009.” |

## Assumptions (label these whenever the data is shown)

| # | Assumption | Where it is set |
| --- | --- | --- |
| A1 | Every business, reference, amount and ledger ID is invented. | `src/data.js`, `public/mock-data/` |
| A2 | The 30-minute posting window is a demo setting, not a banking standard. | `RULE_SETTINGS.maxPostingDelayMinutes` |
| A3 | The SGD/USD 10,000 large-amount threshold is a demo setting, not a regulatory threshold. | `RULE_SETTINGS.largeTransactionThresholds` |
| A4 | The 24-case mix is chosen to show each exception type. It does not represent how often each type occurs at OCBC. | `src/data.js` |
| A5 | The manual workflow on the “today” slide is our working assumption, to be validated with operations users (SCRUM-8). | Pitch deck, slide 4 |
| A6 | The investigation playback is a simulation of specialist steps using real rule results; no AI agents run. | `src/AgentStage.jsx` |
| A7 | Every channel uses a `QR-…` style reference for simplicity. In practice, OneCollect’s QR reference applies to PayNow QR, and card, bank-transfer and cross-border payments carry their own identifiers. Matching only compares references, so outcomes are unaffected. | `src/data.js` |

## Future refinements

Proposals for after the submission; none are needed for the demo.

1. **References by channel.** Give card, bank-transfer and cross-border cases their own synthetic reference formats instead of `QR-…` (removes A7).
2. **Exception report as the starting point.** Add a synthetic next-day exception-report CSV that lists the open cases, so the demo starts from the same file operations staff use.
3. **Case mix.** Once the user survey (SCRUM-33) shows which exceptions are most common, weight the demo cases towards them.

Any data change must keep `npm test` and `npm run db:seed:check` passing, since the seed is generated from the same records.
