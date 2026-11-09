# Dashboard metrics (prototype)

This document describes the local, synthetic-data preview of SCRUM-49. The role selector is a demo control, not authentication. Figures are derived from the current browser state after each local mutation; there is no shared database or server-side authorisation yet. The clickable Analyst handoff is saved only in that browser.

## Scope and formulas

The dashboard selects one currency, SGD or USD. Its cohort is every collection record in that currency, across the dates shown above the chart. No foreign-exchange conversion or mixed-currency total is used. Collection amounts are parsed into integer cents before aggregation.

| Display | Prototype definition | Destination |
| --- | --- | --- |
| Default queue headline | Current role queue count, broken down by case status for Analyst or review reason for Reviewer. Queue value is shown separately in the same card. | That role's queue, selected currency. |
| Collection volume | Sum and count of cohort collections, once per collection ID. | All transactions, selected currency. |
| Matched amount | Sum and count of cohort cases whose current status is `Auto matched` or `Reviewed match`. | Matched transactions, selected currency. |
| Unresolved amount | Collection volume minus matched amount; all other current statuses are unresolved. | Unresolved transactions, selected currency. |
| Large transactions | Count of unresolved cohort cases marked as requiring human verification. This does not mean they can all be approved. | Unresolved large transactions, selected currency. |
| Reconciliation summary | Matched case count of all cohort case count. A zero denominator displays 0 of 0. | All transactions, selected currency. |

The three monetary choices in the headline dropdown use the same cohort for both roles. The default queue count is a current-state task summary; it uses a category breakdown rather than a time chart. For monetary choices, the chart accumulates the chosen subset by collection time in Singapore time. Its X bounds come from all cohort collections. A zero-valued subset with a nonempty cohort draws a flat line; no collections show an empty state. The final plotted value is the exact headline amount before normalising to SVG coordinates.

## Role views

| Role | Queue card and list predicate | Next action |
| --- | --- | --- |
| Analyst | Unresolved cases in the selected currency, except those currently sent for review. Returned cases reappear. The full work queue uses the same predicate across currencies. | Returned cases first, then oldest collection and case ID. Open the shared case evidence to investigate or revise a handoff. |
| Reviewer | `Needs review` cases with an eligible posting under the current demo matching rules, except cases returned to Analyst. The queue includes saved local Analyst handoffs and other unsubmitted demo candidates. | Analyst submissions first, then large-amount verification, then oldest collection and case ID. Open the same case evidence and decision form. |

The queue-card count and link share the same role predicate and currency filter. The navigation badge counts that role's queue across all currencies. Recent case activity is filtered to the selected currency; entries without a case ID are labelled workspace events.

## Production dependency

The Jira ticket's full dashboard needs SCRUM-39, SCRUM-42, SCRUM-43 and SCRUM-44. Once those land, this local model must be replaced with a signed-in, RLS-scoped `get_dashboard_metrics` read using persisted cases, current submissions, assignment, active allocation, revalidation state and `queue_entered_at`. The prototype's handoffs are stored in localStorage, its collection-time ordering is not queue age, and its role selector does not enforce separation of duties. It does not satisfy cross-workspace access or stale-response acceptance criteria.
