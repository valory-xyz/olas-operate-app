import { useCallback } from 'react';

import { AgentType } from '@/constants';
import { Maybe } from '@/types/Util';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

/**
 * The one-time chat cost note shown on the first Send to an agent,
 * remembered per agent instance in the Pearl store.
 */
export const useChatCostNote = (
  agentType: AgentType,
  serviceConfigId: Maybe<string>,
) => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const seenByService = storeState?.[agentType]?.chatCostNoteSeen;

  // Wait for the store, so a note already seen never shows again.
  const shouldShowCostNote =
    storeState !== undefined &&
    !!serviceConfigId &&
    seenByService?.[serviceConfigId] !== true;

  const markCostNoteSeen = useCallback(() => {
    if (!serviceConfigId) return;
    store?.set?.(`${agentType}.chatCostNoteSeen`, {
      ...seenByService,
      [serviceConfigId]: true,
    });
  }, [agentType, seenByService, serviceConfigId, store]);

  return { shouldShowCostNote, markCostNoteSeen };
};
