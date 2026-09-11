import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import {
  EVERYTHING_SMOOTH_OPTION,
  EVERYTHING_SMOOTH_RATING,
  ONBOARDING_SURVEY_EXPIRY_MS,
} from '@/components/OnboardingSurvey/constants';
import { AgentMap, AgentType } from '@/constants';
import {
  FrictionAreaId,
  OnboardingSurveyService,
  SubmitSurveyResponse,
  SurveyRating,
} from '@/service/OnboardingSurvey';
import { OnboardingSurveyState, OsInfo } from '@/types/ElectronApi';

import { useElectronApi } from './useElectronApi';
import { useOnlineStatusContext } from './useOnlineStatus';
import { useServices } from './useServices';
import { useStore } from './useStore';

const STORE_KEY = 'onboardingSurvey';

// Session state shared by the modal, the sidebar alert and Home, each of which mounts its own
// hook instance. Lives in the query cache (as `useConnectSession` does) rather than module scope.
const ONBOARDING_SURVEY_SESSION_KEY = 'onboardingSurveySession';

type SurveySession = {
  isOpen: boolean;
  hasAutoOpened: boolean;
};

const INITIAL_SESSION: SurveySession = {
  isOpen: false,
  hasAutoOpened: false,
};

export type SurveyAnswers = {
  frictionAreas: FrictionAreaId[];
  rating: SurveyRating;
  comment: string;
};

type SubmitResult = SubmitSurveyResponse;

const SUBMISSION_METADATA_ERROR =
  'Could not read app details for the submission';

const toSeconds = (ms: number) => Math.max(0, Math.floor(ms / 1000));

/**
 * Owns the post-setup questionnaire decision (OPE-1899): trigger, once-per-account gating,
 * expiry and the submission payload. The gate is `storeState.onboardingSurvey` only; the triggers
 * arm it. `connect.firstRunCompleted` is per service and must never gate it. Accounts that
 * predate the feature (`timingUnavailable: true`, see `useOnboardingSurveyTiming`) never arm:
 * the functional scope excludes a retroactive trigger.
 */
export const useOnboardingSurvey = () => {
  const queryClient = useQueryClient();
  const { store, getAppVersion, getOsInfo } = useElectronApi();
  const { storeState } = useStore();
  const { selectedAgentType } = useServices();
  const { isOnline } = useOnlineStatusContext();

  const { data: session = INITIAL_SESSION } = useQuery<SurveySession>({
    queryKey: [ONBOARDING_SURVEY_SESSION_KEY],
    // Never fetched — written directly through `setQueryData`.
    queryFn: () => INITIAL_SESSION,
    enabled: false,
    initialData: INITIAL_SESSION,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Read from the cache, not the render closure: several consumers run their effects in the same
  // commit over the same stale `session`, and this is what stops two of them arming at once.
  const readSession = useCallback(
    (): SurveySession =>
      queryClient.getQueryData<SurveySession>([
        ONBOARDING_SURVEY_SESSION_KEY,
      ]) ?? INITIAL_SESSION,
    [queryClient],
  );

  const patchSession = useCallback(
    (patch: Partial<SurveySession>) => {
      queryClient.setQueryData<SurveySession>(
        [ONBOARDING_SURVEY_SESSION_KEY],
        (prev) => ({ ...(prev ?? INITIAL_SESSION), ...patch }),
      );
    },
    [queryClient],
  );

  const survey: OnboardingSurveyState = useMemo(
    () => storeState?.[STORE_KEY] ?? {},
    [storeState],
  );

  // `undefined` until StoreProvider hydrates. Acting before that would read an absent
  // `onboardingSurvey` as "never shown" and re-prompt a user who already completed it.
  const isStoreHydrated = storeState !== undefined;

  const firstShownAtMs = useMemo(() => {
    if (!survey.firstShownAt) return null;
    const parsed = Date.parse(survey.firstShownAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [survey.firstShownAt]);

  // Derived on read rather than scheduled; a timer would not survive a restart.
  const isExpired =
    firstShownAtMs !== null &&
    Date.now() - firstShownAtMs > ONBOARDING_SURVEY_EXPIRY_MS;

  const isEligible = isStoreHydrated && !survey.completed && !isExpired;

  // Only an account classified as new (see `useOnboardingSurveyTiming`) may ever arm. `undefined`
  // means not classified yet, `true` means it predates the feature; neither arms.
  const isNewAccount = survey.timingUnavailable === false;

  /** Records the moment the survey was first shown, plus the agent whose success armed it. */
  const markShown = useCallback(
    (agentType: AgentType) => {
      store?.set?.(`${STORE_KEY}.firstShownAt`, new Date().toISOString());
      store?.set?.(`${STORE_KEY}.agentType`, agentType);
    },
    [store],
  );

  // The green "earned" line (`isEpochTargetMet`). RewardProvider writes the flag together with
  // the agent that earned it; a flag without the agent was set before that write existed, which
  // is itself proof the account predates the feature, so it never arms.
  const stakingTriggerAgentType = storeState?.firstStakingRewardAgentType;
  const isStakingTriggerFired =
    storeState?.firstStakingRewardAchieved === true &&
    stakingTriggerAgentType !== undefined &&
    stakingTriggerAgentType !== null;

  // Auto-open, once per account.
  useEffect(() => {
    if (!isEligible || !isNewAccount) return;
    if (survey.dismissed || survey.firstShownAt) return;
    if (!isStakingTriggerFired || !stakingTriggerAgentType) return;
    if (readSession().hasAutoOpened) return;

    patchSession({ hasAutoOpened: true, isOpen: true });
    markShown(stakingTriggerAgentType);
  }, [
    isEligible,
    isNewAccount,
    isStakingTriggerFired,
    markShown,
    patchSession,
    readSession,
    stakingTriggerAgentType,
    survey.dismissed,
    survey.firstShownAt,
  ]);

  // Connect never stakes; `Home` reports the first Profile visit as its equivalent moment.
  const reportConnectProfileVisit = useCallback(() => {
    if (!isEligible || !isNewAccount) return;
    if (selectedAgentType !== AgentMap.Connect) return;
    if (survey.dismissed || survey.firstShownAt) return;
    if (readSession().hasAutoOpened) return;

    patchSession({ hasAutoOpened: true, isOpen: true });
    markShown(AgentMap.Connect);
  }, [
    isEligible,
    isNewAccount,
    markShown,
    patchSession,
    readSession,
    selectedAgentType,
    survey.dismissed,
    survey.firstShownAt,
  ]);

  /** Re-opens the modal at step 1 from the feedback alert. Deliberately does not rewrite `firstShownAt`. */
  const open = useCallback(
    () => patchSession({ isOpen: true }),
    [patchSession],
  );

  const dismiss = useCallback(() => {
    patchSession({ isOpen: false });
    if (!survey.completed) {
      store?.set?.(`${STORE_KEY}.dismissed`, true);
    }
  }, [patchSession, store, survey.completed]);

  const close = useCallback(
    () => patchSession({ isOpen: false }),
    [patchSession],
  );

  const submit = useCallback(
    async (answers: SurveyAnswers): Promise<SubmitResult> => {
      const shownAtMs = firstShownAtMs ?? Date.now();

      // A rejected IPC call must surface as a failed attempt, not an unhandled throw that leaves
      // the modal's submitting state stuck.
      let pearlVersion: string;
      let os: OsInfo;
      let firstAppOpenedAt: unknown;
      try {
        [pearlVersion, os, firstAppOpenedAt] = await Promise.all([
          getAppVersion?.() ?? Promise.resolve(''),
          getOsInfo?.() ??
            Promise.resolve({ type: '', platform: '', arch: '', release: '' }),
          store?.get?.('firstAppOpenedAt') ?? Promise.resolve(''),
        ]);
      } catch (error) {
        console.error(
          'Onboarding survey: could not read submission metadata:',
          error,
        );
        return { success: false, error: SUBMISSION_METADATA_ERROR };
      }

      // `null`, never 0, whenever the duration cannot be trusted. `timingUnavailable` is tri-state:
      // only an explicit `false` (classified as a new account) allows a number.
      const firstOpenedMs =
        typeof firstAppOpenedAt === 'string' && firstAppOpenedAt
          ? Date.parse(firstAppOpenedAt)
          : NaN;
      const timeToFirstSuccessSeconds =
        survey.timingUnavailable !== false || Number.isNaN(firstOpenedMs)
          ? null
          : toSeconds(shownAtMs - firstOpenedMs);

      const result = await OnboardingSurveyService.submit({
        submissionId: crypto.randomUUID(),
        frictionAreas: answers.frictionAreas,
        rating: answers.rating,
        comment: answers.comment,
        os,
        // The agent recorded when the trigger fired, not whichever is selected at submit time.
        agentType: survey.agentType ?? selectedAgentType,
        pearlVersion,
        timeToFirstSuccessSeconds,
        // From the persisted `firstShownAt`, so a return via the feedback alert days later records days.
        timeToCompleteSurveySeconds: toSeconds(Date.now() - shownAtMs),
      });

      if (result.success) {
        store?.set?.(`${STORE_KEY}.completed`, true);
      }

      return result;
    },
    [
      firstShownAtMs,
      getAppVersion,
      getOsInfo,
      selectedAgentType,
      store,
      survey.agentType,
      survey.timingUnavailable,
    ],
  );

  /** Fast exit: no friction, an automatic Good rating, no comment. */
  const submitEverythingSmooth = useCallback(
    () =>
      submit({
        frictionAreas: [EVERYTHING_SMOOTH_OPTION.id],
        rating: EVERYTHING_SMOOTH_RATING,
        comment: '',
      }),
    [submit],
  );

  return {
    // Not gated on `isEligible`: submitting writes `completed`, which would tear the modal down
    // before the success view renders. Everything that *starts* a session is gated instead.
    isModalOpen: isStoreHydrated && session.isOpen,
    showFeedbackAlert: Boolean(
      isEligible && survey.firstShownAt && !session.isOpen,
    ),
    isOnline,
    open,
    close,
    dismiss,
    submit,
    submitEverythingSmooth,
    reportConnectProfileVisit,
  };
};
