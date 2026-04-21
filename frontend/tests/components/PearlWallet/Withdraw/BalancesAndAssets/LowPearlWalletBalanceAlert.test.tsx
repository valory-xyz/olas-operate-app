import { render, screen } from '@testing-library/react';
import React from 'react';

import { EvmChainIdMap } from '../../../../../constants/chains';
import { LowPearlWalletBalanceAlert } from '../../../../../components/PearlWallet/Withdraw/BalancesAndAssets/LowPearlWalletBalanceAlert';
import {
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
} from '../../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../../constants/providers', () => ({}));
jest.mock('../../../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

jest.mock('antd', () => ({
  Flex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Typography: {
    Text: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}));

const mockUsePearlWallet = jest.fn();
jest.mock('../../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

const mockUseBalanceAndRefillRequirementsContext = jest.fn();
const mockUseMasterWalletContext = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useBalanceAndRefillRequirementsContext: () =>
    mockUseBalanceAndRefillRequirementsContext(),
  useMasterWalletContext: () => mockUseMasterWalletContext(),
}));

const mockUseFundingEligibleServices = jest.fn();
jest.mock('../../../../../hooks/useFundingEligibleServices', () => ({
  useFundingEligibleServices: () => mockUseFundingEligibleServices(),
}));

const mockGetInitialDepositForMasterSafe = jest.fn();
jest.mock('../../../../../components/PearlWallet/utils', () => ({
  getInitialDepositForMasterSafe: (...args: unknown[]) =>
    mockGetInitialDepositForMasterSafe(...args),
}));

const mockTokenBalancesToSentence = jest.fn();
jest.mock('../../../../../utils', () => ({
  tokenBalancesToSentence: (v: unknown) => mockTokenBalancesToSentence(v),
}));

const GNOSIS_CHAIN = {
  chainId: EvmChainIdMap.Gnosis,
  chainName: 'Gnosis',
};

describe('LowPearlWalletBalanceAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePearlWallet.mockReturnValue({ chains: [GNOSIS_CHAIN] });
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      isPearlWalletRefillRequired: true,
      getRefillRequirementsOf: jest.fn(),
    });
    mockUseMasterWalletContext.mockReturnValue({
      getMasterSafeOf: () => ({ address: DEFAULT_SAFE_ADDRESS }),
    });
    mockUseFundingEligibleServices.mockReturnValue({
      getFundingEligibleServiceConfigIdsOf: () => [DEFAULT_SERVICE_CONFIG_ID],
    });
    mockGetInitialDepositForMasterSafe.mockReturnValue({ XDAI: { amount: 1 } });
    mockTokenBalancesToSentence.mockReturnValue('1 XDAI');
  });

  it('renders nothing when isPearlWalletRefillRequired is false', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      isPearlWalletRefillRequired: false,
      getRefillRequirementsOf: jest.fn(),
    });

    const { container } = render(<LowPearlWalletBalanceAlert />);
    expect(container.firstChild).toBeNull();
  });

  it('renders token amounts from eligible services only', () => {
    render(<LowPearlWalletBalanceAlert />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText('1 XDAI')).toBeInTheDocument();

    // Only the eligible service ID was passed to getInitialDepositForMasterSafe
    expect(mockGetInitialDepositForMasterSafe).toHaveBeenCalledWith(
      EvmChainIdMap.Gnosis,
      DEFAULT_SAFE_ADDRESS,
      [DEFAULT_SERVICE_CONFIG_ID],
      expect.any(Function),
    );
  });

  it('skips rendering a chain row when no master safe exists for that chain', () => {
    mockUsePearlWallet.mockReturnValue({ chains: [GNOSIS_CHAIN] });
    mockUseMasterWalletContext.mockReturnValue({
      getMasterSafeOf: () => undefined,
    });

    render(<LowPearlWalletBalanceAlert />);

    // Alert still renders (isPearlWalletRefillRequired is true)
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    // But no token sentence was computed — getInitialDepositForMasterSafe not called
    expect(mockGetInitialDepositForMasterSafe).not.toHaveBeenCalled();
    expect(mockTokenBalancesToSentence).not.toHaveBeenCalled();
  });
});
