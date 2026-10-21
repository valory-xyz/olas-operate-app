import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentDisabledAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert';
import { EvmChainIdMap } from '../../../../../../../constants/chains';
import {
  useActiveStakingContractDetails,
  useAgentFundingRequests,
  useAgentRunning,
  useCompleteAgentSetup,
  useIsAgentGeoRestricted,
  useIsInitiallyFunded,
  useMasterWalletContext,
  usePageState,
  useServices,
  useStakingProgram,
} from '../../../../../../../hooks';
import { makeMasterSafe } from '../../../../../../helpers/factories';

// ---------------------------------------------------------------------------
// Mocks — every branch is stubbed to a recognisable marker so precedence can be
// asserted by which marker renders.
// ---------------------------------------------------------------------------
jest.mock('../../../../../../../hooks', () => ({
  useActiveStakingContractDetails: jest.fn(),
  useAgentFundingRequests: jest.fn(),
  useAgentRunning: jest.fn(),
  useCompleteAgentSetup: jest.fn(),
  useIsAgentGeoRestricted: jest.fn(),
  useIsInitiallyFunded: jest.fn(),
  useMasterWalletContext: jest.fn(),
  usePageState: jest.fn(),
  useServices: jest.fn(),
  useStakingProgram: jest.fn(),
}));

jest.mock('../../../../../../../components/ui', () => ({
  AgentSetupCompleteModal: () => null,
  ContentTransition: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FinishingSetupModal: () => null,
  MasterSafeCreationFailedModal: () => null,
  useContentTransitionValue: <T,>(value: T) => value,
}));

jest.mock('../../../../../../../components/AgentLowBalanceAlert', () => ({
  AgentLowBalanceAlert: () => <div>low-balance</div>,
}));
jest.mock('../../../../../../../components/NoStakingRewardsAlert', () => ({
  NoStakingRewardsAlert: () => <div>no-rewards</div>,
}));
jest.mock('../../../../../../../components/AgentWallet/types', () => ({
  STEPS: {},
}));

jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentGeoBlockedAlert',
  () => ({
    AgentGeoBlockedAlert: () => <div>geo-blocked</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentPhasedOutAlert',
  () => ({
    AgentPhasedOutAlert: () => <div>phased-out</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentRunningAlert',
  () => ({
    AgentRunningAlert: () => <div>another-running</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/ContractDeprecatedAlert',
  () => ({
    ContractDeprecatedAlert: () => <div>contract-deprecated</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/EvictedAlert',
  () => ({
    EvictedAlert: () => <div>evicted-locked</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/MasterEoaLowBalanceAlert',
  () => ({
    MasterEoaLowBalanceAlert: () => <div>master-eoa-low-balance</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/NoSlotsAvailableAlert',
  () => ({
    NoSlotsAvailableAlert: () => <div>no-slots</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/UnderConstructionAlert',
  () => ({
    UnderConstructionAlert: () => <div>under-construction</div>,
  }),
);
jest.mock(
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/UnfinishedSetupAlert',
  () => ({
    UnfinishedSetupAlert: () => <div>unfinished-setup</div>,
  }),
);

type StakingOverrides = {
  isSelectedStakingContractDetailsLoading?: boolean;
  isAgentEvicted?: boolean;
  isEligibleForStaking?: boolean;
  hasEnoughServiceSlots?: boolean | null;
  isServiceStaked?: boolean;
  availableRewards?: number;
};

const setup = ({
  staking = {},
  agentConfig = {},
  isInitialFunded = true,
  isStoreLoading = false,
  hasHomeChainSafe = true,
  isMasterWalletFetched = true,
  isMasterWalletFetchFailed = false,
  isAnotherAgentRunning = false,
  isAgentGeoRestricted = false,
  deprecatedStakingProgram = false,
}: {
  staking?: StakingOverrides;
  agentConfig?: Record<string, unknown>;
  isInitialFunded?: boolean;
  isStoreLoading?: boolean;
  hasHomeChainSafe?: boolean;
  isMasterWalletFetched?: boolean;
  isMasterWalletFetchFailed?: boolean;
  isAnotherAgentRunning?: boolean;
  isAgentGeoRestricted?: boolean;
  deprecatedStakingProgram?: boolean;
} = {}) => {
  (useActiveStakingContractDetails as jest.Mock).mockReturnValue({
    isSelectedStakingContractDetailsLoading: false,
    isAgentEvicted: false,
    isEligibleForStaking: true,
    hasEnoughServiceSlots: true,
    isServiceStaked: true,
    ...staking,
    selectedStakingContractDetails: {
      availableRewards: staking.availableRewards ?? 10,
    },
  });
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentType: 'trader',
    selectedAgentConfig: {
      isPhasedOut: false,
      isUnderConstruction: false,
      isGeoLocationRestricted: false,
      displayName: 'Trader',
      evmHomeChainId: EvmChainIdMap.Gnosis,
      ...agentConfig,
    },
  });
  (useIsInitiallyFunded as jest.Mock).mockReturnValue({
    isInitialFunded: isStoreLoading ? undefined : isInitialFunded,
  });
  const masterSafes = hasHomeChainSafe
    ? [makeMasterSafe(EvmChainIdMap.Gnosis)]
    : [];
  (useMasterWalletContext as jest.Mock).mockReturnValue({
    isFetched: isMasterWalletFetched || isMasterWalletFetchFailed,
    masterWallets: isMasterWalletFetched ? masterSafes : undefined,
    getMasterSafeOf: (chainId: number) =>
      isMasterWalletFetched
        ? masterSafes.find((safe) => safe.evmChainId === chainId)
        : undefined,
  });
  (useAgentRunning as jest.Mock).mockReturnValue({ isAnotherAgentRunning });
  (useIsAgentGeoRestricted as jest.Mock).mockReturnValue({
    isAgentGeoRestricted,
  });
  (useStakingProgram as jest.Mock).mockReturnValue({
    selectedStakingProgramMeta: deprecatedStakingProgram
      ? { deprecated: true, name: 'Beta 3' }
      : { deprecated: false, name: 'Beta 3' },
  });
  return render(<AgentDisabledAlert />);
};

describe('AgentDisabledAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePageState as jest.Mock).mockReturnValue({ goto: jest.fn() });
    (useAgentFundingRequests as jest.Mock).mockReturnValue({
      agentTokenRequirements: {},
    });
    (useCompleteAgentSetup as jest.Mock).mockReturnValue({
      setupState: {},
      handleCompleteSetup: jest.fn(),
      modalToShow: null,
      dismissModal: jest.fn(),
      handleTryAgain: jest.fn(),
      handleContactSupport: jest.fn(),
    });
  });

  // The recoverable case renders no eviction alert at all: `AgentRunButton`
  // sits directly above this strip, so a stopped agent already shows
  // "Start agent", and auto-run recovers a running one on its own.
  describe('recoverable eviction', () => {
    it('renders only the low-balance alerts, no eviction alert', () => {
      setup({ staking: { isAgentEvicted: true, isEligibleForStaking: true } });

      expect(screen.getByText('low-balance')).toBeInTheDocument();
      expect(screen.getByText('master-eoa-low-balance')).toBeInTheDocument();
      expect(screen.queryByText('evicted-locked')).not.toBeInTheDocument();
    });

    it('still surfaces an empty reward pool', () => {
      setup({
        staking: {
          isAgentEvicted: true,
          isEligibleForStaking: true,
          availableRewards: 0,
        },
      });

      expect(screen.getByText('no-rewards')).toBeInTheDocument();
    });
  });

  describe('un-recoverable eviction', () => {
    it('pre-empts the low-balance alerts', () => {
      setup({ staking: { isAgentEvicted: true, isEligibleForStaking: false } });

      expect(screen.getByText('evicted-locked')).toBeInTheDocument();
      expect(screen.queryByText('low-balance')).not.toBeInTheDocument();
    });

    // A half-loaded `hasEnoughRewardsAndSlots` forces `isEligibleForStaking`
    // false, which would flash "evicted until <date>" at someone who can
    // re-stake right now.
    it('does not render while staking details are still loading', () => {
      setup({
        staking: {
          isSelectedStakingContractDetailsLoading: true,
          isAgentEvicted: true,
          isEligibleForStaking: false,
        },
      });

      expect(screen.queryByText('evicted-locked')).not.toBeInTheDocument();
    });
  });

  // A funding run can complete, and set the flag, before the Safe exists.
  describe('unfinished setup without a home-chain Pearl Safe', () => {
    it('shows the unfinished-setup alert even when initially funded', () => {
      setup({ isInitialFunded: true, hasHomeChainSafe: false });

      expect(screen.getByText('unfinished-setup')).toBeInTheDocument();
      expect(screen.queryByText('low-balance')).not.toBeInTheDocument();
      expect(useCompleteAgentSetup).toHaveBeenLastCalledWith(true);
    });

    it('waits for master wallets to load before showing it', () => {
      setup({
        isInitialFunded: true,
        hasHomeChainSafe: false,
        isMasterWalletFetched: false,
      });

      expect(screen.queryByText('unfinished-setup')).not.toBeInTheDocument();
      expect(useCompleteAgentSetup).toHaveBeenLastCalledWith(false);
    });

    // react-query marks a query fetched after an error too, with no data.
    it('does not show it when fetching master wallets failed', () => {
      setup({
        isInitialFunded: true,
        isMasterWalletFetched: false,
        isMasterWalletFetchFailed: true,
      });

      expect(screen.queryByText('unfinished-setup')).not.toBeInTheDocument();
      expect(useCompleteAgentSetup).toHaveBeenLastCalledWith(false);
    });

    it('does not show it when the home chain has a Pearl Safe', () => {
      setup({ isInitialFunded: true, hasHomeChainSafe: true });

      expect(screen.queryByText('unfinished-setup')).not.toBeInTheDocument();
      expect(useCompleteAgentSetup).toHaveBeenLastCalledWith(false);
    });

    it('still shows it while the store is loading', () => {
      setup({ isStoreLoading: true, hasHomeChainSafe: true });

      expect(screen.getByText('unfinished-setup')).toBeInTheDocument();
      expect(useCompleteAgentSetup).toHaveBeenLastCalledWith(false);
    });

    it('comes after the phased-out alert', () => {
      setup({ agentConfig: { isPhasedOut: true }, hasHomeChainSafe: false });

      expect(screen.getByText('phased-out')).toBeInTheDocument();
      expect(screen.queryByText('unfinished-setup')).not.toBeInTheDocument();
    });
  });

  describe('branch precedence', () => {
    it.each([
      ['phased-out', { agentConfig: { isPhasedOut: true } }],
      [
        'geo-blocked',
        {
          agentConfig: { isGeoLocationRestricted: true },
          isAgentGeoRestricted: true,
        },
      ],
      ['under-construction', { agentConfig: { isUnderConstruction: true } }],
      ['unfinished-setup', { isInitialFunded: false }],
      ['another-running', { isAnotherAgentRunning: true }],
      ['contract-deprecated', { deprecatedStakingProgram: true }],
      [
        'no-slots',
        { staking: { isServiceStaked: false, hasEnoughServiceSlots: false } },
      ],
    ])(
      '%s still wins when the agent is evicted but eligible',
      (expected, overrides) => {
        setup({
          ...overrides,
          staking: {
            isAgentEvicted: true,
            isEligibleForStaking: true,
            ...(overrides as { staking?: StakingOverrides }).staking,
          },
        });

        expect(screen.getByText(expected)).toBeInTheDocument();
        expect(screen.queryByText('low-balance')).not.toBeInTheDocument();
      },
    );
  });
});
