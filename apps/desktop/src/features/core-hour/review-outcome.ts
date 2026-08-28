export const REVIEW_OUTCOMES = ["on-track", "overcommitted", "underplanned", "interrupted"] as const;
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];
