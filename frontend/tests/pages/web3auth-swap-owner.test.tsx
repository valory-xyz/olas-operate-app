import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';

import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  SECOND_SAFE_ADDRESS,
} from '../helpers/factories';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../components/Web3AuthIframe/Web3AuthSwapOwnerIframe', () => ({
  Web3AuthSwapOwnerIframe: ({
    safeAddress,
    oldOwnerAddress,
    newOwnerAddress,
    backupOwnerAddress,
    chainId,
  }: {
    safeAddress: string;
    oldOwnerAddress: string;
    newOwnerAddress: string;
    backupOwnerAddress: string;
    chainId: number;
  }) => (
    <div data-testid="swap-owner-iframe">
      <span data-testid="safe-address">{safeAddress}</span>
      <span data-testid="old-owner">{oldOwnerAddress}</span>
      <span data-testid="new-owner">{newOwnerAddress}</span>
      <span data-testid="backup-owner">{backupOwnerAddress}</span>
      <span data-testid="chain-id">{chainId}</span>
    </div>
  ),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Must import after mocks are set up
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  default: Web3AuthSwapOwner,
} = require('../../pages/web3auth-swap-owner');
/* eslint-enable @typescript-eslint/no-var-requires */

const VALID_QUERY = {
  safeAddress: DEFAULT_SAFE_ADDRESS,
  oldOwnerAddress: DEFAULT_EOA_ADDRESS,
  newOwnerAddress: SECOND_SAFE_ADDRESS,
  backupOwnerAddress: BACKUP_SIGNER_ADDRESS,
  chainId: '100',
};

describe('Web3AuthSwapOwner page', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('shows error alert when router is not ready', () => {
    mockUseRouter.mockReturnValue({
      isReady: false,
      query: VALID_QUERY,
    } as unknown as ReturnType<typeof useRouter>);

    render(<Web3AuthSwapOwner />);
    expect(screen.getByText('Invalid recovery parameters')).toBeInTheDocument();
  });

  describe.each([
    'safeAddress',
    'oldOwnerAddress',
    'newOwnerAddress',
    'backupOwnerAddress',
    'chainId',
  ] as const)('missing %s', (param) => {
    it(`shows error alert when ${param} is missing`, () => {
      const query = { ...VALID_QUERY };
      delete (query as Record<string, string>)[param];

      mockUseRouter.mockReturnValue({
        isReady: true,
        query,
      } as unknown as ReturnType<typeof useRouter>);

      render(<Web3AuthSwapOwner />);
      expect(
        screen.getByText('Invalid recovery parameters'),
      ).toBeInTheDocument();
    });
  });

  it('logs console.error when params are missing', () => {
    mockUseRouter.mockReturnValue({
      isReady: true,
      query: {},
    } as unknown as ReturnType<typeof useRouter>);

    render(<Web3AuthSwapOwner />);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Missing required parameters for Web3AuthSwapOwner',
    );
  });

  it('renders Web3AuthSwapOwnerIframe with correct props when all params present', () => {
    mockUseRouter.mockReturnValue({
      isReady: true,
      query: VALID_QUERY,
    } as unknown as ReturnType<typeof useRouter>);

    render(<Web3AuthSwapOwner />);
    expect(screen.getByTestId('swap-owner-iframe')).toBeInTheDocument();
    expect(screen.getByTestId('safe-address')).toHaveTextContent(
      DEFAULT_SAFE_ADDRESS,
    );
    expect(screen.getByTestId('old-owner')).toHaveTextContent(
      DEFAULT_EOA_ADDRESS,
    );
    expect(screen.getByTestId('new-owner')).toHaveTextContent(
      SECOND_SAFE_ADDRESS,
    );
    expect(screen.getByTestId('backup-owner')).toHaveTextContent(
      BACKUP_SIGNER_ADDRESS,
    );
    expect(screen.getByTestId('chain-id')).toHaveTextContent('100');
  });

  it('converts chainId to number', () => {
    mockUseRouter.mockReturnValue({
      isReady: true,
      query: { ...VALID_QUERY, chainId: '42161' },
    } as unknown as ReturnType<typeof useRouter>);

    render(<Web3AuthSwapOwner />);
    expect(screen.getByTestId('chain-id')).toHaveTextContent('42161');
  });
});
