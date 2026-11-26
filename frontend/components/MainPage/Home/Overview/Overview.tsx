import { isNil } from 'lodash';

import { MainContentContainer } from '@/components/ui';
import { useServices, useStakingProgram } from '@/hooks';
import {
  hasUnstakedOption,
  isNoStakingProgram,
  isStakingAvailable,
} from '@/utils/stakingProgram';

import { AgentChat } from './AgentChat';
import { AgentInfo } from './AgentInfo';
import { Performance } from './Performance';
import { NotStaked } from './Staking/NotStaked';
import { Staking } from './Staking/Staking';
import { Wallet } from './Wallet';

type OverviewProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

export const Overview = ({ openProfile, hasVisitedProfile }: OverviewProps) => {
  const { selectedAgentConfig, selectedServiceConfigId } = useServices();
  const { stakingProgramIdByServiceConfigId } = useStakingProgram();
  const { hasPerformance, hasAgentChat, evmHomeChainId } = selectedAgentConfig;
  const canStake = isStakingAvailable(selectedAgentConfig, evmHomeChainId);
  const isStakingOptional = hasUnstakedOption(
    selectedAgentConfig,
    evmHomeChainId,
  );
  // Where staking is optional, the service's own program decides: the
  // subgraph's latest contract is cached for a day and outlives an unstake.
  const serviceStakingProgramId = stakingProgramIdByServiceConfigId.get(
    selectedServiceConfigId ?? '',
  );

  const renderStaking = () => {
    if (!canStake) return null;
    if (!isStakingOptional) return <Staking />;
    if (isNil(serviceStakingProgramId)) return null;
    return isNoStakingProgram(serviceStakingProgramId) ? (
      <NotStaked />
    ) : (
      <Staking />
    );
  };

  if (hasAgentChat) {
    return (
      <MainContentContainer vertical>
        <AgentChat key={selectedServiceConfigId} />
      </MainContentContainer>
    );
  }

  return (
    <MainContentContainer vertical gap={40}>
      <AgentInfo />
      {hasPerformance && (
        <Performance
          openProfile={openProfile}
          hasVisitedProfile={hasVisitedProfile}
        />
      )}
      {renderStaking()}
      <Wallet />
    </MainContentContainer>
  );
};
