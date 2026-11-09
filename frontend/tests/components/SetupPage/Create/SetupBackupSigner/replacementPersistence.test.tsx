import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SetupBackupSigner } from '../../../../../components/SetupPage/Create/SetupBackupSigner';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';
import { BackupWalletError } from '../../../../../service/BackupWalletService';
import { Address } from '../../../../../types/Address';
import { BackupWalletType } from '../../../../../types/BackupWallet';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
} from '../../../../helpers/factories';

type BackupPick = { address: Address; type: BackupWalletType };
const previousPick: BackupPick = {
  address: BACKUP_SIGNER_ADDRESS,
  type: 'web3auth',
};
let mockPersistedPick = previousPick;
const mockApply = jest.fn();
const mockGoto = jest.fn();
const mockError = jest.fn();
const mockSetIsReplacingBackup = jest.fn();
const mockSetPassword = jest.fn();
const mockLogEvent = jest.fn();
const mockSetBackupSigner = jest.fn((pick: BackupPick) => {
  mockPersistedPick = pick;
});
const mockSetup = () => ({
  goto: mockGoto,
  isReplacingBackup: true,
  setIsReplacingBackup: mockSetIsReplacingBackup,
  setPassword: mockSetPassword,
  setBackupSigner: mockSetBackupSigner,
});

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../../../../hooks', () => ({
  useSetup: () => mockSetup(),
  useElectronApi: () => ({ logEvent: mockLogEvent }),
  useApplyBackupDuringSetup: () => mockApply,
  useLatchedWeb3AuthEnabled: () => false,
}));
jest.mock('../../../../../hooks/useSetup', () => ({
  useSetup: () => mockSetup(),
}));
jest.mock('../../../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockError }),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../../../components/ui', () => ({
  FormFlex: require('antd').Form,
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock(
  '../../../../../components/SetupPage/Create/SetupCreateHeader',
  () => ({
    SetupCreateHeader: () => null,
  }),
);
jest.mock(
  '../../../../../components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth',
  () => ({
    BackupWalletWeb3Auth: () => null,
  }),
);
jest.mock(
  '../../../../../components/SetupPage/Create/SetupBackupSigner/useWeb3AuthBackupWallet',
  () => ({
    useWeb3AuthBackupWallet: () => ({ openWeb3AuthModel: jest.fn() }),
  }),
);

afterEach(() => jest.restoreAllMocks());

it('preserves the saved choice on a failed replacement and saves only after a successful retry', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  mockApply.mockRejectedValueOnce(
    new BackupWalletError('Network error', 'NETWORK_ERROR'),
  );
  const { unmount } = render(<SetupBackupSigner />);
  const input = screen.getByPlaceholderText(/0x12345/);
  const submit = screen.getByRole('button', { name: 'Continue' });

  fireEvent.change(input, { target: { value: BACKUP_SIGNER_ADDRESS_2 } });
  fireEvent.click(submit);

  await waitFor(() => expect(mockError).toHaveBeenCalledWith('Network error'));
  await waitFor(() => expect(submit).toBeEnabled());
  expect(mockPersistedPick).toEqual(previousPick);
  expect(mockSetBackupSigner).not.toHaveBeenCalled();
  expect(mockGoto).not.toHaveBeenCalled();

  // Remount from the saved choice, as on restart, then retry the replacement.
  unmount();
  expect(mockPersistedPick.type).toBe('web3auth');
  mockApply.mockImplementationOnce(async () => {
    expect(mockPersistedPick).toEqual(previousPick);
  });
  render(<SetupBackupSigner />);
  fireEvent.change(screen.getByPlaceholderText(/0x12345/), {
    target: { value: BACKUP_SIGNER_ADDRESS_2 },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() =>
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
  );
  expect(mockApply).toHaveBeenCalledTimes(2);
  expect(mockPersistedPick).toEqual({
    address: BACKUP_SIGNER_ADDRESS_2,
    type: 'manual',
  });
  expect(mockSetBackupSigner).toHaveBeenCalledTimes(1);
  expect(mockSetIsReplacingBackup).toHaveBeenCalledWith(false);
});
