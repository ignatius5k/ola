# Ola main dashboard — design draft

This is a clickable proposal for the existing Home screen, not a live dashboard change. The [visual draft](dashboard-draft.html) uses illustrative synthetic counts and does not read or change application state. Compare the [Analyst](dashboard-analyst-draft.png) and [Reviewer](dashboard-reviewer-draft.png) renders.

## Job and hierarchy

- **Analyst:** identify a case they can advance, understand why it needs attention, inspect the shared evidence, and send or revise a recommendation.
- **Reviewer:** find a prepared Analyst submission, see the proposed posting and verification concern, inspect the shared evidence, and decide or return it.
- **Home order:** role action counts → queue preview with selected-case detail → shared operations health. The existing navigation, role selector, currency scope, case screen, activity history, and Ola styling remain.

## Specific screen modules used as references

| Mobbin screen | Visible module | Decision adapted for Ola |
| --- | --- | --- |
| [Wrike dashboard](https://mobbin.com/screens/d750f820-568f-4a4f-8540-1692449871de?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | “To review” status column | Separate task states before opening the list. |
| [Xero overview](https://mobbin.com/screens/6ffaff70-fa85-464e-95a0-9faa84dcf9f2?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | “Expenses to review” card | Put a short actionable case list on Home. |
| [Deel Home](https://mobbin.com/screens/f710bb72-af51-48fb-bf05-eb61fa65b7b2?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | “For you today” task panel | Name the kinds of work requiring the selected role. |
| [Airwallex spend request](https://mobbin.com/screens/89c96631-be20-4176-be78-d24175e013ed?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | Request detail beside the list | Show the selected case's request, evidence concern, and next action beside queue rows. |
| [Stripe Transactions](https://mobbin.com/screens/373146e1-8686-43b0-8a10-5da707dc8873?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | Summary counts and filter row | Make each count open the corresponding filtered queue. |
| [Stripe Home](https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) | “Your overview” metric grid | Keep financial and reconciliation metrics together below the role's work. |

The references supply structure and interaction cues. Ola retains its own visual system, copy, records, and policy.

## Proposed behavior

| Area | Analyst | Reviewer |
| --- | --- | --- |
| First count | Needs investigation: unresolved cases that can be worked now, excluding cases sent for review and returned cases counted separately. Escalated cases belong here when Analyst action is required. | Analyst submissions: cases locally sent for review and still eligible for a decision. |
| Second count | Returned for evidence: cases the Reviewer sent back with a reason. | Other demo candidates: rule-eligible cases with no Analyst submission; clearly marked as demo candidates. |
| Third count | Awaiting source: unresolved cases without an eligible posting yet. | Waiting on Analyst: returned submissions; visible for context, outside the active decision queue. |
| Queue order | Returned requests first, then current investigation work. | Analyst submissions first, then other eligible demo candidates. |
| Selected-case detail | Show issue, proposed posting when present, Reviewer request, and the next Analyst action. | Show issue, Analyst recommendation, verification concern, and the next Reviewer action. |

Each status count pairs a short explanation with a verb-led action: **Investigate cases**, **Address request**, and **Check waiting cases** for the Analyst; **Review submission**, **Explore candidates**, and **View return request** for the Reviewer. In the draft, selecting a card filters the sample queue and selects its first case. **Show all preview cases** clears the filter. Selecting a queue row updates the adjacent detail. The detail's primary action shows the intended shared case-screen destination; it does not modify a case. The three operations-health facts also name their drill-down destinations. On a narrow viewport, the detail follows the queue. Keyboard users can reach cards, rows, and actions in visual order.

The queue count and filtered list must use the same predicate and currency. After an Analyst submits, their action count decreases and the Reviewer's submission count increases. A return reverses that movement. Approval removes the case from active queues while leaving it in transaction and activity history.

## States and data boundary

- Empty Analyst queue: say whether all cases are resolved or remaining cases are waiting on evidence.
- Empty Reviewer submissions: say “No Analyst submissions” while showing any separate demo candidates.
- Returned case: expose the Reviewer's reason in the selected-case detail, without making the Analyst search Activity.
- Missing source evidence: show the blocker and avoid presenting a decision-ready action.
- The current prototype has browser-local handoffs and a demo role selector. The draft does not imply shared assignment, authentication, due dates, or queue age. Add those only when the corresponding persisted data and access rules exist.

## Review questions

1. Can an Analyst identify the first case they can advance and a returned request without opening the full queue?
2. Can a Reviewer distinguish an Analyst submission from a rule-eligible demo candidate before opening a case?
3. Does the selected-case detail give enough reason to open the case while keeping the actual decision on the shared case screen?
