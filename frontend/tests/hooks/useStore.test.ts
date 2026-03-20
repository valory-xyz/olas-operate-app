import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { AgentMap } from '../../constants/agent';
import { StoreContext } from '../../context/StoreProvider';
import { useStore } from '../../hooks/useStore';
import { ElectronStore } from '../../types/ElectronApi';
import { BACKUP_SIGNER_ADDRESS } from '../helpers/factories';

const mockStoreState: ElectronStore = {
  environmentName: 'production',
  lastSelectedAgentType: AgentMap.PredictTrader,
  knownVersion: '1.4.5',

  firstStakingRewardAchieved: true,
  recoveryPhraseBackedUp: true,
  mnemonicExists: true,

  [AgentMap.PredictTrader]: {
    isInitialFunded: true,
  },
  [AgentMap.AgentsFun]: {
    isInitialFunded: false,
  },

  autoRun: {
    enabled: true,
    includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
    isInitialized: true,
    userExcludedAgents: [AgentMap.AgentsFun],
  },
  lastProvidedBackupWallet: {
    address: BACKUP_SIGNER_ADDRESS,
    type: 'manual',
  },
};

describe('useStore', () => {
  it('returns the full store state provided by StoreContext', () => {
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        StoreContext.Provider,
        { value: { storeState: mockStoreState } },
        children,
      );

    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.storeState).toBe(mockStoreState);
    expect(result.current.storeState?.environmentName).toBe('production');
    expect(result.current.storeState?.lastSelectedAgentType).toBe(
      AgentMap.PredictTrader,
    );
    expect(result.current.storeState?.knownVersion).toBe('1.4.5');
    expect(result.current.storeState?.firstStakingRewardAchieved).toBe(true);
    expect(result.current.storeState?.recoveryPhraseBackedUp).toBe(true);
    expect(
      result.current.storeState?.[AgentMap.PredictTrader]?.isInitialFunded,
    ).toBe(true);
    expect(result.current.storeState?.autoRun?.enabled).toBe(true);
    expect(result.current.storeState?.autoRun?.userExcludedAgents).toEqual([
      AgentMap.AgentsFun,
    ]);
    expect(result.current.storeState?.lastProvidedBackupWallet?.address).toBe(
      BACKUP_SIGNER_ADDRESS,
    );
  });

  it('returns undefined storeState when no provider wraps it', () => {
    const { result } = renderHook(() => useStore());
    expect(result.current.storeState).toBeUndefined();
  });
});
