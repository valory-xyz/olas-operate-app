import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import {
  EVERYTHING_SMOOTH_OPTION,
  EVERYTHING_SMOOTH_RATING,
  IS_ONBOARDING_SURVEY_ENABLED,
  ONBOARDING_SURVEY_EXPIRY_MS,
} from '@/components/OnboardingSurvey/constants';
import { AgentMap, AgentType } from '@/constants';
import {
  FrictionAreaId,
  OnboardingSurveyService,
  SurveyRating,
} from '@/service/OnboardingSurvey';
import { OnboardingSurveyState } from '@/types/ElectronApi';
import { isValidServiceId } from '@/utils/service';

import { useElectronApi } from './useElectronApi';
import { useOnlineStatusContext } from './useOnlineStatus';
import { useServices } from './useServices';
import { useStore } from './useStore';

const STORE_KEY = 'onboardingSurvey';

/**
 * Session-scoped state shared by every call site of this hook.
 *
 * The modal (rendered from `Main`), the sidebar nudge and `Home`'s Connect trigger each mount
 * their own instance, so "is the modal open" and "has this session already armed" cannot live in
 * component state. Held in the always-mounted query cache — the same device `useConnectSession`
 * uses for its launch-suppression flag — rather than in module scope, so it resets with the
 * cache and never leaks between tests.
 */
const ONBOARDING_SURVEY_SESSION_KEY = 'onboardingSurveySession';

type SurveySession = {
  /** The modal is on screen. Once open it stays open, even if the 2-week window lapses. */
  isOpen: boolean;
  /** This session has already auto-opened the modal, so a second consumer must not re-fire it. */
  hasAutoOpened: boolean;
  /** The one-time timing classification has been written (or is in flight) this session. */
  hasClassifiedTiming: boolean;
};

const INITIAL_SESSION: SurveySession = {
  isOpen: false,
  hasAutoOpened: false,
  hasClassifiedTiming: false,
};

export type SurveyAnswers = {
  frictionAreas: FrictionAreaId[];
  rating: SurveyRating;
  comment: string;
};

const toSeconds = (ms: number) => Math.max(0, Math.floor(ms / 1000));

/**
 * Owns the whole post-setup questionnaire decision (OPE-1899): when it may open, whether the
 * sidebar nudge shows, when it expires, and what a submission contains.
 *
 * `Main`, `Sidebar`, `Home` and the survey components are all consumers — keeping the
 * "shown once, ever" rule here rather than spread across three components is what makes it
 * testable without rendering the app.
 *
 * The gate is `storeState.onboardingSurvey` and nothing else. `firstStakingRewardAchieved` and
 * the Connect Profile visit only *arm* the survey; they never gate it. In particular
 * `connect.firstRunCompleted` must never be used here — it is a `Record<serviceConfigId, …>`,
 * so it is per service, and a second Connect instance would re-trigger a survey that is meant to
 * be once per account.
 */
export const useOnboardingSurvey = () => {
  const queryClient = useQueryClient();
  const { store, getAppVersion, getOsInfo } = useElectronApi();
  const { storeState } = useStore();
  const {
    services,
    isFetched: isServicesFetched,
    selectedAgentType,
  } = useServices();
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

  /**
   * Reads the session straight from the cache instead of the render closure.
   *
   * Several consumers run their effects in the same commit, all closed over the same stale
   * `session`. Reading here — after an earlier effect's synchronous `setQueryData` — is what
   * stops two of them arming the survey at once.
   */
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

  /**
   * The 2-week window, derived on read rather than scheduled: a timer would not survive an app
   * restart, and the requirement is only that the survey is gone once the window has passed.
   */
  const isExpired =
    firstShownAtMs !== null &&
    Date.now() - firstShownAtMs > ONBOARDING_SURVEY_EXPIRY_MS;

  const isEligible =
    IS_ONBOARDING_SURVEY_ENABLED &&
    isStoreHydrated &&
    !survey.completed &&
    !isExpired;

  /** Records the moment the survey was first shown, plus the agent whose success armed it. */
  const markShown = useCallback(
    (agentType: AgentType) => {
      store?.set?.(`${STORE_KEY}.firstShownAt`, new Date().toISOString());
      store?.set?.(`${STORE_KEY}.agentType`, agentType);
    },
    [store],
  );

  // Staking trigger. `RewardProvider` already writes this flag the first time `isEpochTargetMet`
  // turns true — the green "earned" line, not an on-chain reward transfer — and it is
  // account-wide rather than per agent, so nothing new has to be built here.
  const isStakingTriggerFired = storeState?.firstStakingRewardAchieved === true;

  /**
   * Auto-open, once per account.
   *
   * Skipped when `firstShownAt` is already set: the modal is shown in the session the trigger
   * fires and never re-opens by itself on a later launch — only the nudge persists.
   */
  useEffect(() => {
    if (!isEligible) return;
    if (survey.dismissed || survey.firstShownAt) return;
    if (!isStakingTriggerFired) return;
    if (readSession().hasAutoOpened) return;

    patchSession({ hasAutoOpened: true, isOpen: true });
    markShown(selectedAgentType);
  }, [
    isEligible,
    isStakingTriggerFired,
    markShown,
    patchSession,
    readSession,
    selectedAgentType,
    survey.dismissed,
    survey.firstShownAt,
  ]);

  /**
   * One-time timing classification.
   *
   * An account that already has a deployed service predates this feature, so its
   * `firstAppOpenedAt` was stamped long after the user actually started — the elapsed time would
   * be wrong rather than merely missing, so it is reported as `null` instead. Waiting for
   * `isServicesFetched` matters: an unfetched list would misclassify a returning user as new.
   *
   * Deliberately not gated on the kill switch: the classification must happen on the first
   * hydration after the update, before the user deploys anything. A build shipped with the switch
   * off that only classified once it was flipped on would call every user who onboarded in
   * between "pre-existing".
   *
   * "Deployed" means an on-chain token id. The middleware writes `token: -1` for a service that
   * has been created but not deployed, which is exactly the state a new account is in when `Main`
   * first mounts, so `!= null` would call every new account pre-existing.
   */
  useEffect(() => {
    if (!isStoreHydrated) return;
    if (survey.timingUnavailable !== undefined) return;
    // `isFetched` is derived from `!isLoading`, which is also true for a query that never ran
    // (offline at launch); an undefined list is the tell that nothing was actually fetched.
    if (!isServicesFetched || services === undefined) return;
    if (readSession().hasClassifiedTiming) return;

    const hasPreExistingService = services.some((service) =>
      isValidServiceId(
        service.chain_configs?.[service.home_chain]?.chain_data?.token,
      ),
    );

    patchSession({ hasClassifiedTiming: true });
    store?.set?.(`${STORE_KEY}.timingUnavailable`, hasPreExistingService);
  }, [
    isServicesFetched,
    isStoreHydrated,
    patchSession,
    readSession,
    services,
    store,
    survey.timingUnavailable,
  ]);

  /**
   * The Connect trigger, reported by `Home` when the user opens the Profile tab.
   *
   * Connect never stakes, so it has no reward signal; the Profile visit is the equivalent
   * moment. Reported in rather than read out of `Home`'s local state so the hook stays the only
   * thing that knows the gating rules.
   */
  const reportConnectProfileVisit = useCallback(() => {
    if (!isEligible) return;
    if (selectedAgentType !== AgentMap.Connect) return;
    if (survey.dismissed || survey.firstShownAt) return;
    if (readSession().hasAutoOpened) return;

    patchSession({ hasAutoOpened: true, isOpen: true });
    markShown(AgentMap.Connect);
  }, [
    isEligible,
    markShown,
    patchSession,
    readSession,
    selectedAgentType,
    survey.dismissed,
    survey.firstShownAt,
  ]);

  /** Re-opens the modal at step 1 from the nudge. Deliberately does not rewrite `firstShownAt`. */
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
    async (answers: SurveyAnswers) => {
      const shownAtMs = firstShownAtMs ?? Date.now();

      const [pearlVersion, os, firstAppOpenedAt] = await Promise.all([
        getAppVersion?.() ?? Promise.resolve(''),
        getOsInfo?.() ??
          Promise.resolve({ type: '', platform: '', arch: '', release: '' }),
        store?.get?.('firstAppOpenedAt') ?? Promise.resolve(''),
      ]);

      // `null`, never 0: the contract distinguishes "we could not measure this" from "it took no
      // time", and an account that predates the feature has no honest number to report.
      const firstOpenedMs =
        typeof firstAppOpenedAt === 'string' && firstAppOpenedAt
          ? Date.parse(firstAppOpenedAt)
          : NaN;
      const timeToFirstSuccessSeconds =
        survey.timingUnavailable || Number.isNaN(firstOpenedMs)
          ? null
          : toSeconds(shownAtMs - firstOpenedMs);

      const result = await OnboardingSurveyService.submit({
        submissionId: crypto.randomUUID(),
        frictionAreas: answers.frictionAreas,
        rating: answers.rating,
        comment: answers.comment,
        os,
        // The agent recorded when the trigger fired, not whichever is selected now — otherwise a
        // user who switches agents before submitting from the nudge reports the wrong one.
        agentType: survey.agentType ?? selectedAgentType,
        pearlVersion,
        timeToFirstSuccessSeconds,
        // Measured from the persisted `firstShownAt`, not from mount, so a user who dismisses and
        // returns days later via the nudge records days rather than seconds.
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

  /** Fast exit: no friction, an automatic Good rating, no comment, straight to the success view. */
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
    // Deliberately not gated on `isEligible`. Submitting writes `completed`, which makes the
    // survey ineligible — gating here would tear the modal down before the user ever sees the
    // success view. Everything that *starts* a session (auto-open, `open`) is gated instead.
    isModalOpen:
      IS_ONBOARDING_SURVEY_ENABLED && isStoreHydrated && session.isOpen,
    showNudge: Boolean(isEligible && survey.firstShownAt && !session.isOpen),
    isOnline,
    open,
    close,
    dismiss,
    submit,
    submitEverythingSmooth,
    reportConnectProfileVisit,
  };
};
