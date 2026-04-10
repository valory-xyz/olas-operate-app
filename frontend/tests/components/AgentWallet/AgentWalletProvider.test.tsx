import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { AgentWalletProvider, useAgentWallet } from '../../../components/AgentWallet/AgentWalletProvider';
import { STEPS } from '../../../components/AgentWallet/types';
import {
  useAvailableAgentAssets,
  useBalanceContext,
  usePageState,
  useRewardContext,
  useService,
  useServices,
} from '../../../hooks';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));

jest.mock('../../../hooks', () => ({
  useServices: jest.fn(),
  useService: jest.fn(),
  useBalanceContext: jest.fn(),
  useRewardContext: jest.fn(),
  useAvailableAgentAssets: jest.fn(),
  usePageState: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;
const mockUseAvailableAgentAssets = useAvailableAgentAssets as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;

const setupDefaultMocks = (navParams: Record<string, unknown> = {}) => {
  mockUsePageState.mockReturnValue({ navParams });
  mockUseServices.mockReturnValue({
    isLoading: false,
    selectedAgentConfig: { evmHomeChainId: 100 },
    selectedService: null,
    selectedAgentNameOrFallback: 'Test Agent',
  });
  mockUseService.mockReturnValue({ isLoaded: true });
  mockUseBalanceContext.mockReturnValue({ isLoading: false });
  mockUseRewardContext.mockReturnValue({
    availableRewardsForEpochEth: 0,
    accruedServiceStakingRewards: 0,
  });
  mockUseAvailableAgentAssets.mockReturnValue({ availableAssets: [] });
};

const createWrapper = () => {
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(AgentWalletProvider, null, children);
  return Wrapper;
};

describe('AgentWalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes walletStep to AGENT_WALLET_SCREEN when navParams has no initialStep', () => {
    setupDefaultMocks({});

    const { result } = renderHook(() => useAgentWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.walletStep).toBe(STEPS.AGENT_WALLET_SCREEN);
  });

  it('initializes walletStep to initialStep from navParams', () => {
    setupDefaultMocks({ initialStep: STEPS.FUND_AGENT });

    const { result } = renderHook(() => useAgentWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.walletStep).toBe(STEPS.FUND_AGENT);
  });

  it('initializes fundInitialValues to {} when navParams has no initialFundValues', () => {
    setupDefaultMocks({});

    const { result } = renderHook(() => useAgentWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fundInitialValues).toEqual({});
  });

  it('initializes fundInitialValues from navParams initialFundValues', () => {
    const initialFundValues = { '0xTokenAddress': '1000000000000000000' };
    setupDefaultMocks({ initialFundValues });

    const { result } = renderHook(() => useAgentWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fundInitialValues).toEqual(initialFundValues);
  });

  it('initializes both walletStep and fundInitialValues from navParams', () => {
    const initialFundValues = { '0xTokenAddress': '500000000000000000' };
    setupDefaultMocks({
      initialStep: STEPS.FUND_AGENT,
      initialFundValues,
    });

    const { result } = renderHook(() => useAgentWallet(), {
      wrapper: createWrapper(),
    });

    expect(result.current.walletStep).toBe(STEPS.FUND_AGENT);
    expect(result.current.fundInitialValues).toEqual(initialFundValues);
  });
});
