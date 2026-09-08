import { ONE_DAY_INTERVAL } from '@/constants/intervals';

/**
 * Kill switch for the post-setup questionnaire (OPE-1899).
 *
 * Ships `false`: the survey posts to `POST /api/feedback/onboarding-survey`, which is still an
 * unmerged draft in `valory-xyz/autonolas-frontend-mono` (PR #449) and whose Google
 * service-account credentials, `BLOB_READ_WRITE_TOKEN` and Vercel WAF rule are one-time manual
 * setup that is not done. Enabling before that lands means every submission fails and the user
 * keeps a nudge they cannot clear.
 *
 * Flip to `true` in a follow-up once the endpoint is deployed to production — that is the only
 * change required; nothing else is gated on it.
 */
export const IS_ONBOARDING_SURVEY_ENABLED = false;

/**
 * How long the questionnaire stays reachable after it is first shown. Past this the nudge
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

/**
 * Three-grade rating, worst to best. The images are PNGs rather than literal emoji: emoji render
 * differently across macOS, Windows and Linux, and a Linux install may have no colour emoji font
 * at all.
 */
export const RATING_OPTIONS = [
  { value: 1, label: 'Bad', icon: '/onboarding-survey-rating-bad.png' },
  { value: 2, label: 'OK', icon: '/onboarding-survey-rating-ok.png' },
  { value: 3, label: 'Good', icon: '/onboarding-survey-rating-good.png' },
] as const;
