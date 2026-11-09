import { render, screen } from '@testing-library/react';

import { BackupSignerGate } from '../../../components/SetupPage/BackupSignerGate';
import { useLatchedBackupSigner } from '../../../context/LatchedBackupSignerContext';

jest.mock('../../../constants/providers', () => ({ PROVIDERS: {} }));

const mockLatchedSigner = {
  state: 'ready',
  backupSignerAddress: '0x2222222222222222222222222222222222222222',
};
let mockGuard: { latchedSigner: unknown; isBackupSignerError: boolean };

jest.mock('../../../hooks', () => ({
  useBackupSignerGuard: () => mockGuard,
}));

jest.mock('../../../components/ui', () => ({
  CardSkeleton: () => <div data-testid="card-skeleton" />,
  cardStyles: {},
  Alert: ({ message }: { message?: React.ReactNode }) => (
    <div role="alert">{message}</div>
  ),
}));

const Child = () => {
  const latched = useLatchedBackupSigner();
  return <div data-testid="child">{JSON.stringify(latched)}</div>;
};

describe('BackupSignerGate', () => {
  it('shows a loader while the backup signer is unsettled', () => {
    mockGuard = { latchedSigner: null, isBackupSignerError: false };
    render(<BackupSignerGate>{() => <Child />}</BackupSignerGate>);

    expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('shows a retrying error when the Safe owners can not be read', () => {
    mockGuard = { latchedSigner: null, isBackupSignerError: true };
    render(<BackupSignerGate>{() => <Child />}</BackupSignerGate>);

    expect(
      screen.getByText(/Couldn.t check your backup wallet/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('renders children with the latched signer and shares it through the context', () => {
    mockGuard = {
      latchedSigner: mockLatchedSigner,
      isBackupSignerError: false,
    };
    const children = jest.fn(() => <Child />);
    render(<BackupSignerGate>{children}</BackupSignerGate>);

    expect(children).toHaveBeenCalledWith(mockLatchedSigner);
    expect(screen.getByTestId('child')).toHaveTextContent(
      JSON.stringify(mockLatchedSigner),
    );
  });
});
