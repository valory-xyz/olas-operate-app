import { ONBOARDING_SURVEY_API_URL } from '@/constants';
import { OsInfo } from '@/types/ElectronApi';
import { parseApiError } from '@/utils';

/** The closed set pearl-api validates `frictionAreas` against. */
export type FrictionAreaId =
  | 'backup_wallet'
  | 'choosing_agent'
  | 'activity_rewards'
  | 'funding_agent'
  | 'agent_activity'
  | 'other'
  | 'everything_smooth';

/** 1 = Bad, 2 = OK, 3 = Good. Numeric, not the label — pearl-api rejects strings. */
export type SurveyRating = 1 | 2 | 3;

/**
 * The exact body `POST /api/feedback/onboarding-survey` accepts.
 *
 * Deliberately carries no wallet address, `serviceConfigId` or account identifier, and none may
 * be added: the questionnaire is anonymous by product requirement. Building the request from
 * this type is what enforces that — a caller cannot smuggle a field the type does not name.
 */
export type OnboardingSurveyPayload = {
  /** UUID v4, fresh per submission attempt. The server does not dedupe; it is for analysis only. */
  submissionId: string;
  frictionAreas: FrictionAreaId[];
  rating: SurveyRating;
  comment: string;
  os: OsInfo;
  /** The `AgentMap` id (e.g. `polymarket_trader`), never a display name. */
  agentType: string;
  pearlVersion: string;
  /** `null` when Pearl has no usable first-open timestamp. Never coerced to 0. */
  timeToFirstSuccessSeconds: number | null;
  timeToCompleteSurveySeconds: number;
};

export type SubmitSurveyResponse =
  | { success: true }
  | { success: false; error: string };

const SUBMIT_ERROR = 'Failed to submit feedback';

/**
 * Sends one submission.
 *
 * Any 2xx means accepted — including when pearl-api fell back to its internal buffer, which is
 * indistinguishable from a plain success on the wire. There is deliberately **no retry**: the
 * server does not dedupe, so a retry appends a second row to the sheet.
 */
const submit = async (
  payload: OnboardingSurveyPayload,
): Promise<SubmitSurveyResponse> => {
  try {
    const response = await fetch(ONBOARDING_SURVEY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await parseApiError(response, SUBMIT_ERROR);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : SUBMIT_ERROR,
    };
  }
};

export const OnboardingSurveyService = { submit };
