import { AgentType, ONBOARDING_SURVEY_API_URL } from '@/constants';
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

/** 1 = Bad, 2 = OK, 3 = Good. Numeric; pearl-api rejects labels. */
export type SurveyRating = 1 | 2 | 3;

/**
 * The exact body `POST /api/feedback/onboarding-survey` accepts. Anonymous by product
 * requirement: no wallet address, `serviceConfigId` or account identifier may be added.
 */
export type OnboardingSurveyPayload = {
  /** UUID v4, fresh per attempt. The server does not dedupe. */
  submissionId: string;
  frictionAreas: FrictionAreaId[];
  rating: SurveyRating;
  comment: string;
  os: OsInfo;
  agentType: AgentType;
  pearlVersion: string;
  /** `null` when there is no usable first-open timestamp. Never coerced to 0. */
  timeToFirstSuccessSeconds: number | null;
  timeToCompleteSurveySeconds: number;
};

export type SubmitSurveyResponse =
  | { success: true }
  | { success: false; error: string };

const SUBMIT_ERROR = 'Failed to submit feedback';

/** Any 2xx means accepted. No retry: the server does not dedupe, so a retry appends a row. */
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
