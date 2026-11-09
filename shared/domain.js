// Canonical persisted role and case-workflow values for the connected Ola app.
// SCRUM-38 owns transition rules; UI labels are presentation values, not states.
export const ROLE = Object.freeze({
  ANALYST: 'analyst',
  REVIEWER: 'reviewer'
});

export const WORKFLOW_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  AWAITING_EVIDENCE: 'awaiting_evidence',
  AWAITING_REVIEW: 'awaiting_review',
  RETURNED: 'returned',
  ESCALATED: 'escalated',
  VERIFIED: 'verified',
  AUTO_MATCHED: 'auto_matched'
});
