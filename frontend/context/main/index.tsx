import { PropsWithChildren } from 'react';

import { BalanceProvider } from './BalanceProvider';
import { MasterSafeProvider } from './MasterSafeProvider';
import { RewardProvider } from './RewardProvider';
import { ServicesProvider } from './ServicesProvider';
import { StakingContractInfoProvider } from './StakingContractInfoProvider';
import { StakingProgramProvider } from './StakingProgramContext';
import { WalletProvider } from './WalletProvider';

export const MainProvider = ({ children }: PropsWithChildren) => {
  return (
    <WalletProvider>
      <MasterSafeProvider>
        <ServicesProvider>
          <StakingProgramProvider>
            <RewardProvider>
              <BalanceProvider>
                <StakingContractInfoProvider>
                  {children}
                </StakingContractInfoProvider>
              </BalanceProvider>
            </RewardProvider>
          </StakingProgramProvider>
        </ServicesProvider>
      </MasterSafeProvider>
    </WalletProvider>
  );
};
