import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useState } from 'react';

import { SETUP_SCREEN } from '../../constants/setupScreen';
import { SetupContext } from '../../context/SetupProvider';
import { useSetup } from '../../hooks/useSetup';
import { useStore } from '../../hooks/useStore';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
} from '../helpers/factories';

const mockStoreSet = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({
    store: { set: mockStoreSet },
  }),
}));

jest.mock('../../hooks/useStore', () => ({
  useStore: jest.fn(),
}));

const mockUseStore = useStore as jest.Mock;

type SetupObjectType = {
  state: string;
  prevState: string | null;
  backupSigner?: { address: string; type: string };
};

const createSetupWrapper = (initialStoreState = {}) => {
  mockUseStore.mockReturnValue({ storeState: initialStoreState });

  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) => {
    const [setupObject, setSetupObject] = useState<SetupObjectType>({
      state: SETUP_SCREEN.Welcome,
      prevState: null,
      backupSigner: undefined,
    });
    const [password, setPassword] = useState<string | null>(null);

    return createElement(
      SetupContext.Provider,
      {
        value: { setupObject, setSetupObject, password, setPassword } as never,
      },
      children,
    );
  };
};

describe('useSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('goto', () => {
    it('updates state and sets prevState to the previous screen', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      expect(result.current.state).toBe(SETUP_SCREEN.Welcome);

      act(() => {
        result.current.goto(SETUP_SCREEN.SetupPassword);
      });

      expect(result.current.state).toBe(SETUP_SCREEN.SetupPassword);
      expect(result.current.prevState).toBe(SETUP_SCREEN.Welcome);
    });

    it('preserves prevState chain through multiple navigations', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.goto(SETUP_SCREEN.SetupPassword);
      });
      act(() => {
        result.current.goto(SETUP_SCREEN.SetupBackupSigner);
      });

      expect(result.current.state).toBe(SETUP_SCREEN.SetupBackupSigner);
      expect(result.current.prevState).toBe(SETUP_SCREEN.SetupPassword);
    });
  });

  describe('setBackupSigner', () => {
    it('persists backup signer to Electron store', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.setBackupSigner({
          address: BACKUP_SIGNER_ADDRESS,
          type: 'web3auth',
        });
      });

      expect(mockStoreSet).toHaveBeenCalledWith('lastProvidedBackupWallet', {
        address: BACKUP_SIGNER_ADDRESS,
        type: 'web3auth',
      });
    });

    it('persists manual type backup signer', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.setBackupSigner({
          address: BACKUP_SIGNER_ADDRESS_2,
          type: 'manual',
        });
      });

      expect(mockStoreSet).toHaveBeenCalledWith('lastProvidedBackupWallet', {
        address: BACKUP_SIGNER_ADDRESS_2,
        type: 'manual',
      });
    });
  });

  describe('sync effect', () => {
    // NOTE: The sync effect uses Object.assign (mutate-in-place) which doesn't
    // create a new reference, so React may not re-render. We test the mutation
    // indirectly by verifying the setup object is mutated on render.

    it('restores backupSigner from store when address and type are present', () => {
      const wrapper = createSetupWrapper({
        lastProvidedBackupWallet: {
          address: BACKUP_SIGNER_ADDRESS,
          type: 'web3auth',
        },
      });
      const { result } = renderHook(() => useSetup(), { wrapper });

      // The sync effect uses Object.assign (mutate-in-place) so React doesn't
      // re-render. Trigger a re-render via goto to surface the mutation.
      act(() => {
        result.current.goto(SETUP_SCREEN.SetupPassword);
      });

      expect(result.current.backupSigner).toEqual({
        address: BACKUP_SIGNER_ADDRESS,
        type: 'web3auth',
      });
    });

    it('restores manual-type backupSigner from store', () => {
      const wrapper = createSetupWrapper({
        lastProvidedBackupWallet: {
          address: BACKUP_SIGNER_ADDRESS_2,
          type: 'manual',
        },
      });
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.goto(SETUP_SCREEN.SetupPassword);
      });

      expect(result.current.backupSigner).toEqual({
        address: BACKUP_SIGNER_ADDRESS_2,
        type: 'manual',
      });
    });

    it('does not set backupSigner when store has no lastProvidedBackupWallet', () => {
      const wrapper = createSetupWrapper({});
      const { result } = renderHook(() => useSetup(), { wrapper });

      expect(result.current.backupSigner).toBeUndefined();
    });

    it('does not set backupSigner when address is missing', () => {
      const wrapper = createSetupWrapper({
        lastProvidedBackupWallet: { type: 'web3auth' },
      });
      const { result } = renderHook(() => useSetup(), { wrapper });

      expect(result.current.backupSigner).toBeUndefined();
    });

    it('does not set backupSigner when type is missing', () => {
      const wrapper = createSetupWrapper({
        lastProvidedBackupWallet: {
          address: BACKUP_SIGNER_ADDRESS,
        },
      });
      const { result } = renderHook(() => useSetup(), { wrapper });

      expect(result.current.backupSigner).toBeUndefined();
    });
  });

  it('spreads setupObject fields to the return value', () => {
    const wrapper = createSetupWrapper();
    const { result } = renderHook(() => useSetup(), { wrapper });

    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('prevState');
    expect(result.current).toHaveProperty('goto');
    expect(result.current).toHaveProperty('setBackupSigner');
  });

  describe('password', () => {
    it('exposes password from SetupContext (initially null)', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      expect(result.current.password).toBeNull();
    });

    it('setPassword updates the exposed password', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.setPassword('hunter2');
      });
      expect(result.current.password).toBe('hunter2');
    });

    it('setPassword(null) clears the password', () => {
      const wrapper = createSetupWrapper();
      const { result } = renderHook(() => useSetup(), { wrapper });

      act(() => {
        result.current.setPassword('hunter2');
      });
      act(() => {
        result.current.setPassword(null);
      });
      expect(result.current.password).toBeNull();
    });
  });
});
