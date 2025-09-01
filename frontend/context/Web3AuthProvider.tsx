import { WEB3AUTH_NETWORK } from '@web3auth/modal';
import {
  type Web3AuthContextConfig,
  Web3AuthProvider as Web3AuthPackageProvider,
} from '@web3auth/modal/react';
import { PropsWithChildren } from 'react';

const clientId =
  'BIbjF8vZWdH8UA4MkKGfOWNE2mOSxj_os5umaImVDG3WL_zFQIg1S0j2gQvsC7ylKme2WfdQDlDJ0JYO_fJeUJU';

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    modalConfig: {
      connectors: {
        metamask: {
          label: 'MetaMask',
          showOnModal: false,
        },
        auth: {
          label: 'Auth',
          showOnModal: true,
        },
      },
    },
    mfaLevel: 'optional',
    mfaSettings: {
      socialBackupFactor: { enable: true, mandatory: true, priority: 1 },
      passkeysFactor: { enable: true, mandatory: false, priority: 2 },
      authenticatorFactor: { enable: true, mandatory: false, priority: 3 },
      deviceShareFactor: { enable: false },
      backUpShareFactor: { enable: false },
      passwordFactor: { enable: false },
    },
    uiConfig: {
      logoLight: '/onboarding-robot.svg',
      logoDark: '/onboarding-robot.svg',
    },
  },
};

export const Web3AuthProvider = ({ children }: PropsWithChildren) => {
  return (
    <Web3AuthPackageProvider config={web3AuthContextConfig}>
      {children}
    </Web3AuthPackageProvider>
  );
};
