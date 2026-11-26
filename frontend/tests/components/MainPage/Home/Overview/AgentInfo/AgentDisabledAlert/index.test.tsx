import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentDisabledAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert';
import { EvmChainIdMap } from '../../../../../../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../../../../../../constants/deployment';
import {
  useActiveStakingContractDetails,
  useAgentFundingRequests,
  useAgentRunning,
  useCompleteAgentSetup,
  useIsAgentGeoRestricted,
  useIsInitiallyFunded,
  useIsPolySafeService,
  useMasterWalletContext,
  usePageState,
  usePrestartCheck,
  useServices,
  useStakingProgram,
} from '../../../../../../../hooks';
import { PrestartCheck } from '../../../../../../../hooks/usePrestartCheck';
import { AgentIssue } from '../../../../../../../types';
import {
  makeAgentIssue,
  makeFailedPrestartCheck,
  makeMasterSafe,
} from '../../../../../../helpers/factories';

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
  useIsPolySafeService: jest.fn(),
  useMasterWalletContext: jest.fn(),
  usePageState: jest.fn(),
  usePrestartCheck: jest.fn(),
  useRunsInsideEvictionWindow: jest.requireActual(
    '../../../../../../../hooks/useRunsInsideEvictionWindow',
  ).useRunsInsideEvictionWindow,
  useServices: jest.fn(),
  useStakingProgram: jest.fn(),
  isPrestartCheckBlocking: jest.requireActual(
    '../../../../../../../hooks/usePrestartCheck',
  ).isPrestartCheckBlocking,
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
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/AgentIssuesAlert',
  () => ({
    AgentIssuesAlert: ({ issues }: { issues: AgentIssue[] }) => (
      <div>
        {issues
          .map(({ title, description }) => `issue: ${title} / ${description}`)
          .join('\n')}
      </div>
    ),
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
  '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/RetiredContractAlert',
  () => ({
    RetiredContractAlert: ({
      stakingProgramName,
      isWithdrawalOnly,
      cooldownEndsAt,
    }: {
      stakingProgramName: string;
      isWithdrawalOnly: boolean;
      cooldownEndsAt?: number;
    }) => (
      <div>
        {`contract-retired: ${stakingProgramName} withdrawalOnly=${isWithdrawalOnly} cooldownEndsAt=${cooldownEndsAt ?? 'none'}`}
      </div>
    ),
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
  isServiceStakedForMinimumDuration?: boolean;
  evictionExpiresAt?: number;
  availableRewards?: number;
};

const setup = ({
  staking = {},
  agentConfig = {},
  isInitialFunded = true,
  isStoreLoading = false,
  hasHomeChainSafe = true,
  isMasterWalletsLoaded = true,
  isAnotherAgentRunning = false,
  isAgentGeoRestricted = false,
  deprecatedStakingProgram = false,
  retiredStakingProgram = false,
  isPolySafeService = false,
  isRunning = false,
  agentIssues,
  prestartCheck,
  isChecking = false,
}: {
  staking?: StakingOverrides;
  agentConfig?: Record<string, unknown>;
  isInitialFunded?: boolean;
  isStoreLoading?: boolean;
  hasHomeChainSafe?: boolean;
  isMasterWalletsLoaded?: boolean;
  isAnotherAgentRunning?: boolean;
  isAgentGeoRestricted?: boolean;
  deprecatedStakingProgram?: boolean;
  retiredStakingProgram?: boolean;
  isPolySafeService?: boolean;
  isRunning?: boolean;
  agentIssues?: AgentIssue[];
  prestartCheck?: PrestartCheck;
  isChecking?: boolean;
} = {}) => {
  (useActiveStakingContractDetails as jest.Mock).mockReturnValue({
    isSelectedStakingContractDetailsLoading: false,
    isAgentEvicted: false,
    isEligibleForStaking: true,
    hasEnoughServiceSlots: true,
    isServiceStaked: true,
    isServiceStakedForMinimumDuration: true,
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
    selectedService: {
      service_config_id: 'sc-1',
      deploymentStatus: isRunning
        ? MiddlewareDeploymentStatusMap.DEPLOYED
        : MiddlewareDeploymentStatusMap.BUILT,
    },
    deploymentDetails: {
      healthcheck: {
        agent_health: agentIssues === undefined ? {} : { issues: agentIssues },
      },
    },
  });
  (usePrestartCheck as jest.Mock).mockReturnValue({
    result: prestartCheck,
    isChecking,
  });
  (useIsInitiallyFunded as jest.Mock).mockReturnValue({
    isInitialFunded: isStoreLoading ? undefined : isInitialFunded,
  });
  const masterSafes = hasHomeChainSafe
    ? [makeMasterSafe(EvmChainIdMap.Gnosis)]
    : [];
  (useMasterWalletContext as jest.Mock).mockReturnValue({
    masterWallets: isMasterWalletsLoaded ? masterSafes : undefined,
    getMasterSafeOf: (chainId: number) =>
      isMasterWalletsLoaded
        ? masterSafes.find((safe) => safe.evmChainId === chainId)
        : undefined,
  });
  (useAgentRunning as jest.Mock).mockReturnValue({ isAnotherAgentRunning });
  (useIsAgentGeoRestricted as jest.Mock).mockReturnValue({
    isAgentGeoRestricted,
  });
  (useStakingProgram as jest.Mock).mockReturnValue({
    selectedStakingProgramMeta: {
      deprecated: deprecatedStakingProgram,
      retired: retiredStakingProgram,
      name: 'Beta 3',
    },
  });
  (useIsPolySafeService as jest.Mock).mockReturnValue({ isPolySafeService });
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

    it('keeps the funding alerts under the banner of an agent that can run evicted', () => {
      setup({
        staking: {
          isAgentEvicted: true,
          isEligibleForStaking: false,
          availableRewards: 0,
        },
        agentConfig: { canRunWhileEvicted: true },
      });

      expect(screen.getByText('evicted-locked')).toBeInTheDocument();
      expect(screen.getByText('low-balance')).toBeInTheDocument();
      // An evicted agent earns nothing, so an empty pool is not news.
      expect(screen.queryByText('no-rewards')).not.toBeInTheDocument();
    });

    it.each([
      ['evicted with a day left', true, 86_400, 'evicted-locked', 'no-slots'],
      [
        'evicted inside the start margin',
        true,
        10 * 60,
        'no-slots',
        'evicted-locked',
      ],
      ['evicted past its window', true, -60, 'no-slots', 'evicted-locked'],
      ['not evicted', false, 86_400, 'no-slots', 'evicted-locked'],
    ])(
      'on a full contract, an agent that can run evicted and is %s shows %s',
      (_, isAgentEvicted, secondsLeft, shown, hidden) => {
        setup({
          staking: {
            isAgentEvicted,
            isEligibleForStaking: false,
            evictionExpiresAt: Math.round(Date.now() / 1000) + secondsLeft,
            isServiceStaked: false,
            hasEnoughServiceSlots: false,
          },
          agentConfig: { canRunWhileEvicted: true },
        });

        expect(screen.getByText(shown)).toBeInTheDocument();
        expect(screen.queryByText(hidden)).not.toBeInTheDocument();
      },
    );

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
        isMasterWalletsLoaded: false,
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
    ])('comes after the %s alert', (expected, overrides) => {
      setup({ ...overrides, isInitialFunded: true, hasHomeChainSafe: false });

      expect(screen.getByText(expected)).toBeInTheDocument();
      expect(screen.queryByText('unfinished-setup')).not.toBeInTheDocument();
    });
  });

  describe('agent issues', () => {
    const issue = makeAgentIssue({ since: 1700000000 });

    it("shows a running agent's issues as the agent wrote them", () => {
      setup({ isRunning: true, agentIssues: [issue] });

      expect(
        screen.getByText(`issue: ${issue.title} / ${issue.description}`),
      ).toBeInTheDocument();
      expect(screen.queryByText('low-balance')).not.toBeInTheDocument();
    });

    it.each([
      ['under construction', { agentConfig: { isUnderConstruction: true } }],
      ['another agent running', { isAnotherAgentRunning: true }],
      ['a deprecated contract', { deprecatedStakingProgram: true }],
      [
        'an eviction',
        { staking: { isAgentEvicted: true, isEligibleForStaking: false } },
      ],
    ])('wins over %s', (_, overrides) => {
      setup({ ...overrides, isRunning: true, agentIssues: [issue] });

      expect(
        screen.getByText(`issue: ${issue.title} / ${issue.description}`),
      ).toBeInTheDocument();
    });

    it('gives way to a region block', () => {
      setup({
        agentConfig: { isGeoLocationRestricted: true },
        isAgentGeoRestricted: true,
        isRunning: true,
        agentIssues: [issue],
      });

      expect(screen.getByText('geo-blocked')).toBeInTheDocument();
      expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
    });

    it.each([
      ['an agent that reports none', { isRunning: true, agentIssues: [] }],
      ['an agent that does not report them', { isRunning: true }],
      ['a stopped agent', { isRunning: false, agentIssues: [issue] }],
    ])('shows nothing for %s', (_, overrides) => {
      setup(overrides);

      expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
      expect(screen.getByText('low-balance')).toBeInTheDocument();
    });
  });

  describe('prestart check of the last start', () => {
    const issue = makeAgentIssue();

    it('shows the issues of a failed check', () => {
      setup({ prestartCheck: makeFailedPrestartCheck([issue]) });

      expect(
        screen.getByText(`issue: ${issue.title} / ${issue.description}`),
      ).toBeInTheDocument();
      expect(screen.queryByText('low-balance')).not.toBeInTheDocument();
    });

    it('shows that Pearl could not check, for a check that did not complete', () => {
      setup({ prestartCheck: { status: 'error', issues: [] } });

      expect(
        screen.getByText(
          "issue: Couldn't check the agent / Pearl couldn't check whether the Trader agent can run on this network. Check your internet connection and try starting the agent again.",
        ),
      ).toBeInTheDocument();
    });

    it.each(['passed', 'not_supported'] as const)(
      'shows nothing after a %s check',
      (status) => {
        setup({ prestartCheck: { status, issues: [] } });

        expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
      },
    );

    it('hides the last result while the next start re-runs the check', () => {
      setup({
        isChecking: true,
        prestartCheck: makeFailedPrestartCheck([issue]),
      });

      expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
    });

    it('shows nothing once the agent runs', () => {
      setup({
        isRunning: true,
        prestartCheck: makeFailedPrestartCheck([issue]),
      });

      expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
    });

    it.each([
      ['under construction', { agentConfig: { isUnderConstruction: true } }],
      ['unfinished setup', { isInitialFunded: false }],
      ['another agent running', { isAnotherAgentRunning: true }],
      ['a deprecated contract', { deprecatedStakingProgram: true }],
      [
        'no free slots',
        { staking: { isServiceStaked: false, hasEnoughServiceSlots: false } },
      ],
      [
        'an eviction',
        { staking: { isAgentEvicted: true, isEligibleForStaking: false } },
      ],
    ])('wins over %s', (_, overrides) => {
      setup({
        ...overrides,
        prestartCheck: makeFailedPrestartCheck([issue]),
      });

      expect(
        screen.getByText(`issue: ${issue.title} / ${issue.description}`),
      ).toBeInTheDocument();
    });

    it('gives way to a region block', () => {
      setup({
        agentConfig: { isGeoLocationRestricted: true },
        isAgentGeoRestricted: true,
        prestartCheck: makeFailedPrestartCheck([issue]),
      });

      expect(screen.getByText('geo-blocked')).toBeInTheDocument();
      expect(screen.queryByText(/^issue:/)).not.toBeInTheDocument();
    });
  });

  describe('retired staking program', () => {
    it('pre-empts no-slots, eviction, empty-pool and agent low-balance alerts, keeping the Master EOA one', () => {
      setup({
        retiredStakingProgram: true,
        deprecatedStakingProgram: true,
        staking: {
          isServiceStaked: false,
          hasEnoughServiceSlots: false,
          isAgentEvicted: true,
          isEligibleForStaking: false,
          availableRewards: 0,
        },
      });

      expect(
        screen.getByText(
          'contract-retired: Beta 3 withdrawalOnly=false cooldownEndsAt=none',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('master-eoa-low-balance')).toBeInTheDocument();
      for (const marker of [
        'contract-deprecated',
        'no-slots',
        'evicted',
        'no-rewards',
        'low-balance',
      ]) {
        expect(screen.queryByText(marker)).not.toBeInTheDocument();
      }
    });

    it.each([
      ['staked', { isServiceStaked: true }],
      ['evicted', { isServiceStaked: false, isAgentEvicted: true }],
    ])(
      'passes the end of the minimum staking period while %s inside it',
      (_, staking) => {
        setup({
          retiredStakingProgram: true,
          staking: {
            ...staking,
            isServiceStakedForMinimumDuration: false,
            evictionExpiresAt: 1_800_000_000,
          },
        });

        expect(
          screen.getByText(
            'contract-retired: Beta 3 withdrawalOnly=false cooldownEndsAt=1800000000',
          ),
        ).toBeInTheDocument();
      },
    );

    it('shows no cooldown once the agent is unstaked', () => {
      setup({
        retiredStakingProgram: true,
        staking: {
          isServiceStaked: false,
          isServiceStakedForMinimumDuration: false,
          evictionExpiresAt: 1_800_000_000,
        },
      });

      expect(
        screen.getByText(
          'contract-retired: Beta 3 withdrawalOnly=false cooldownEndsAt=none',
        ),
      ).toBeInTheDocument();
    });

    it('uses the withdrawal-only variant for a PolySafe service', () => {
      setup({ retiredStakingProgram: true, isPolySafeService: true });

      expect(
        screen.getByText(
          'contract-retired: Beta 3 withdrawalOnly=true cooldownEndsAt=none',
        ),
      ).toBeInTheDocument();
    });

    it('yields to the earlier blocking alerts', () => {
      setup({ retiredStakingProgram: true, isAnotherAgentRunning: true });

      expect(screen.getByText('another-running')).toBeInTheDocument();
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
      [
        'unfinished-setup',
        {
          isInitialFunded: true,
          hasHomeChainSafe: false,
          isAnotherAgentRunning: true,
        },
      ],
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
