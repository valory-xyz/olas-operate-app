import { WEB3AUTH_NETWORK } from '@web3auth/modal';
import {
  type Web3AuthContextConfig,
  Web3AuthProvider as Web3AuthPackageProvider,
} from '@web3auth/modal/react';
import { PropsWithChildren } from 'react';

const clientId = `${process.env.WEB3AUTH_CLIENT_ID}`;

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    mfaLevel: 'optional',
    mfaSettings: {
      socialBackupFactor: { enable: true, mandatory: true },
      passkeysFactor: { enable: true, mandatory: false },
      authenticatorFactor: { enable: true, mandatory: false },
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
