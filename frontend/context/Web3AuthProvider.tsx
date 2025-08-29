import { WEB3AUTH_NETWORK } from '@web3auth/modal';
import {
  type Web3AuthContextConfig,
  Web3AuthProvider as Web3AuthPackageProvider,
} from '@web3auth/modal/react';
import { PropsWithChildren } from 'react';

import { isDev } from '@/constants/env';

const clientId = `${process.env.WEB3AUTH_CLIENT_ID}`;

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: isDev
      ? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
      : WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
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
