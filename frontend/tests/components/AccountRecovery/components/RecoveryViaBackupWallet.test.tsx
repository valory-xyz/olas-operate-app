import { render, screen } from '@testing-library/react';

import { ForgotPasswordCard } from '../../../../components/AccountRecovery/components/RecoveryViaBackupWallet';

let mockStatus: 'loading' | 'enabled' | 'disabled' = 'enabled';

jest.mock('../../../../hooks', () => ({
  useWeb3AuthStatus: () => ({
    status: mockStatus,
    isWeb3AuthEnabled: mockStatus === 'enabled',
    isLoading: mockStatus === 'loading',
  }),
}));

jest.mock(
  '../../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => ({
      onNext: jest.fn(),
    }),
  }),
);

jest.mock('../../../../components/ui', () => ({
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IconContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('ForgotPasswordCard', () => {
  it('mentions the backup wallet when Web3Auth is enabled', () => {
    mockStatus = 'enabled';
    render(<ForgotPasswordCard />);
    expect(
      screen.getByText(
        'Reset your password using the secret recovery phrase or the backup wallet.',
      ),
    ).toBeInTheDocument();
  });

  it('mentions only the recovery phrase when Web3Auth is disabled', () => {
    mockStatus = 'disabled';
    render(<ForgotPasswordCard />);
    expect(
      screen.getByText('Reset your password using the secret recovery phrase.'),
    ).toBeInTheDocument();
  });

  it('shows the recovery-phrase copy while the status loads (e.g. offline)', () => {
    mockStatus = 'loading';
    render(<ForgotPasswordCard />);
    expect(
      screen.getByText('Reset your password using the secret recovery phrase.'),
    ).toBeInTheDocument();
  });
});
