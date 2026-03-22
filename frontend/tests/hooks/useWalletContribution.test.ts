import { renderHook } from '@testing-library/react';

// Import after mocks
import { useWalletContribution } from '../../hooks/useWalletContribution';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({}));

const mockUseTokensFundingStatus = jest.fn();
jest.mock(
  '../../components/SetupPage/FundYourAgent/hooks/useTokensFundingStatus',
  () => ({
    useTokensFundingStatus: () => mockUseTokensFundingStatus(),
  }),
);

describe('useWalletContribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when tokensFundingStatus is null', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty array when tokensFundingStatus is empty object', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {},
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions).toEqual([]);
  });

  it('returns isLoading from upstream hook', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {},
      isLoading: true,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.isLoading).toBe(true);
  });

  it('includes tokens where wallet contributes more than 0', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {
        OLAS: {
          symbol: 'OLAS',
          iconSrc: '/tokens/olas.png',
          totalAmount: 100,
          pendingAmount: 60,
          areFundsReceived: false,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions).toEqual([
      { symbol: 'OLAS', iconSrc: '/tokens/olas.png', amount: 40 },
    ]);
  });

  it('excludes tokens where wallet contribution is zero', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {
        OLAS: {
          symbol: 'OLAS',
          iconSrc: '/tokens/olas.png',
          totalAmount: 100,
          pendingAmount: 100,
          areFundsReceived: false,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions).toEqual([]);
  });

  it('handles fully funded tokens (pendingAmount = 0)', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {
        XDAI: {
          symbol: 'XDAI',
          iconSrc: '/tokens/xdai.png',
          totalAmount: 11.5,
          pendingAmount: 0,
          areFundsReceived: true,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions).toEqual([
      { symbol: 'XDAI', iconSrc: '/tokens/xdai.png', amount: 11.5 },
    ]);
  });

  it('rounds contribution amount to 4 decimal places', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {
        OLAS: {
          symbol: 'OLAS',
          iconSrc: '/tokens/olas.png',
          totalAmount: 100.123456789,
          pendingAmount: 50.1,
          areFundsReceived: false,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    expect(result.current.walletContributions[0].amount).toBe(50.0235);
  });

  it('handles multiple tokens with mixed contributions', () => {
    mockUseTokensFundingStatus.mockReturnValue({
      tokensFundingStatus: {
        OLAS: {
          symbol: 'OLAS',
          iconSrc: '/tokens/olas.png',
          totalAmount: 100,
          pendingAmount: 100,
          areFundsReceived: false,
        },
        XDAI: {
          symbol: 'XDAI',
          iconSrc: '/tokens/xdai.png',
          totalAmount: 11.5,
          pendingAmount: 0,
          areFundsReceived: true,
        },
        USDC: {
          symbol: 'USDC',
          iconSrc: '/tokens/usdc.png',
          totalAmount: 50,
          pendingAmount: 30,
          areFundsReceived: false,
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useWalletContribution());
    // OLAS excluded (contribution = 0), XDAI and USDC included
    expect(result.current.walletContributions).toHaveLength(2);
    expect(result.current.walletContributions).toEqual(
      expect.arrayContaining([
        { symbol: 'XDAI', iconSrc: '/tokens/xdai.png', amount: 11.5 },
        { symbol: 'USDC', iconSrc: '/tokens/usdc.png', amount: 20 },
      ]),
    );
  });
});
