import { ONE_DAY_INTERVAL } from '@/constants/intervals';

/**
 * How long the questionnaire stays reachable after it is first shown. Past this the feedback alert
 * disappears and the survey can no longer be opened, with no row sent.
 *
 * Checked on open only, so a user who already has the modal open when the deadline passes may
 * still submit.
 */
export const ONBOARDING_SURVEY_EXPIRY_MS = 14 * ONE_DAY_INTERVAL;

/** Matches `FEEDBACK_COMMENT_MAX_LENGTH` in pearl-api — a longer body is rejected with a 400. */
export const ONBOARDING_SURVEY_COMMENT_MAX_LENGTH = 2000;

/**
 * Friction options for step 1, in the order the design lists them.
 *
 * The ids are the closed set `pearl-api` validates against; the labels are the design's wording,
 * which differs from the ticket description's (for example "Choosing your agent", not "Choosing
 * which agent to set up"). The design is the source of truth for copy.
 */
export const FRICTION_AREA_OPTIONS = [
  { id: 'backup_wallet', label: 'Setting up backup wallet' },
  { id: 'choosing_agent', label: 'Choosing your agent' },
  { id: 'activity_rewards', label: 'Understanding activity rewards' },
  { id: 'funding_agent', label: 'Funding your agent' },
  { id: 'agent_activity', label: 'Understanding what your agent does' },
  { id: 'other', label: 'Other', hint: '(please describe in the next step)' },
] as const;

/**
 * The fast exit. Separated from the friction list by a rule in the design, and mutually
 * exclusive with every option above — pearl-api rejects a payload that combines them.
 */
export const EVERYTHING_SMOOTH_OPTION = {
  id: 'everything_smooth',
  label: 'Everything was smooth',
} as const;

/** Rating recorded for the fast-exit path, where the user is never asked. 3 = Good. */
export const EVERYTHING_SMOOTH_RATING = 3;

/** Which of the app's semantic colour sets a picked rating is tinted with. */
export type RatingTone = 'error' | 'warning' | 'success';

/**
 * Three-grade rating, worst to best. The images are PNGs rather than literal emoji: emoji render
 * differently across macOS, Windows and Linux, and a Linux install may have no colour emoji font
 * at all.
 */
export const RATING_OPTIONS: ReadonlyArray<{
  value: 1 | 2 | 3;
  label: string;
  icon: string;
  tone: RatingTone;
}> = [
  {
    value: 1,
    label: 'Bad',
    icon: '/onboarding-survey-rating-bad.png',
    tone: 'error',
  },
  {
    value: 2,
    label: 'OK',
    icon: '/onboarding-survey-rating-ok.png',
    tone: 'warning',
  },
  {
    value: 3,
    label: 'Good',
    icon: '/onboarding-survey-rating-good.png',
    tone: 'success',
  },
];
