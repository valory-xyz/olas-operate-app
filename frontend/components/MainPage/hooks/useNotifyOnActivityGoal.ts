import { useEffect, useRef } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { useActivityGoal } from '@/hooks/useActivityGoal';
import { useAgentRunning } from '@/hooks/useAgentRunning';
import { useElectronApi } from '@/hooks/useElectronApi';

const GOAL_REACHED_MESSAGE =
  'Your agent reached its daily goal for this epoch.';

type LastSeenGoal = {
  serviceConfigId: string;
  periodStart: number;
  isMet: boolean;
};

/**
 * Notifies the user when the running staking agent reaches its activity goal.
 * Fires only on an observed not-met → met change within one period, so the
 * first reading after mount (or a restart) never repeats a past notification.
 * Connect's goal-reached notification is sent by Auto-run on hand-over.
 */
export const useNotifyOnActivityGoal = () => {
  const { showNotification } = useElectronApi();
  const { runningAgentType, runningServiceConfigId } = useAgentRunning();
  const isStakingAgent =
    !!runningAgentType && AGENT_CONFIG[runningAgentType]?.hasStaking;
  const { activityGoal } = useActivityGoal(
    isStakingAgent ? runningServiceConfigId : null,
  );

  const lastSeenRef = useRef<LastSeenGoal | null>(null);

  useEffect(() => {
    if (!runningServiceConfigId || !isStakingAgent || !activityGoal) return;

    const lastSeen = lastSeenRef.current;
    const hasJustMetGoal =
      lastSeen?.serviceConfigId === runningServiceConfigId &&
      lastSeen.periodStart === activityGoal.period_start &&
      !lastSeen.isMet &&
      activityGoal.is_met;

    lastSeenRef.current = {
      serviceConfigId: runningServiceConfigId,
      periodStart: activityGoal.period_start,
      isMet: activityGoal.is_met,
    };

    if (hasJustMetGoal) showNotification?.(GOAL_REACHED_MESSAGE);
  }, [activityGoal, isStakingAgent, runningServiceConfigId, showNotification]);
};
