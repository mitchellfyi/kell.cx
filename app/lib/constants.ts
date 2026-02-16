// Time constants in milliseconds
export const TIME_CONSTANTS = {
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  VERY_GOOD: 70,
  GOOD: 60,
  MEDIUM: 40,
  LOW: 20,
} as const;