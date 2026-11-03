// Edit this file to change the demo's matching policy. Every automatic rule must pass.
// The evaluators are code rather than UI switches so policy changes are reviewable in Git.
export const RULE_SETTINGS = Object.freeze({
  maxPostingDelayMinutes: 30,
  nearbyCandidateWindowMinutes: 30,
  feeExplanationTolerance: 0.001,
  reviewerMatchCategories: Object.freeze(['fee', 'reference'])
});

export const AUTO_MATCH_RULES = Object.freeze([
  {
    id: 'unique-reference',
    label: 'One exact reference',
    description: 'The collection reference must identify exactly one ledger posting.',
    test: ({ exactReference }) => exactReference.length === 1
  },
  {
    id: 'credit-only',
    label: 'Credit posting only',
    description: 'A reversal or negative posting cannot close automatically.',
    test: ({ row }) => row?.type === 'credit' && row.amount >= 0
  },
  {
    id: 'same-currency',
    label: 'Same currency',
    description: 'The collection and ledger currencies must be identical.',
    test: ({ collection, row }) => row?.currency === collection.currency
  },
  {
    id: 'exact-amount',
    label: 'Exact amount',
    description: 'The posted amount must equal the collected amount; fees need review.',
    test: ({ collection, row }) => row?.amount === collection.amount
  },
  {
    id: 'time-window',
    label: 'Within the posting window',
    description: settings => `The posting must be within ${settings.maxPostingDelayMinutes} minutes of collection.`,
    test: ({ delayMinutes }, settings) => delayMinutes <= settings.maxPostingDelayMinutes
  }
]);

export function evaluateAutoRules(context, settings = RULE_SETTINGS) {
  return AUTO_MATCH_RULES.map(rule => ({ id: rule.id, label: rule.label, passed: rule.test(context, settings) }));
}

export function ruleDescriptions(settings = RULE_SETTINGS) {
  return AUTO_MATCH_RULES.map(rule => ({ id: rule.id, label: rule.label, description: typeof rule.description === 'function' ? rule.description(settings) : rule.description }));
}
