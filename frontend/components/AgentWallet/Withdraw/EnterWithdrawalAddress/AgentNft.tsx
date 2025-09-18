import { Flex } from 'antd';

import { NftFilled } from '@/components/custom-icons';
import { OLAS_CONTRACTS } from '@/config/olasContracts';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { ContractType } from '@/enums/Contract';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

const useAgentNft = () => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceNftTokenId } = useService(selectedService?.service_config_id);

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;
  const middlewareChain = selectedAgentConfig?.middlewareHomeChainId;
  const serviceRegistryL2ContractAddress =
    OLAS_CONTRACTS[evmHomeChainId][ContractType.ServiceRegistryL2].address;

  return `${BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN[middlewareChain]}/token/${serviceRegistryL2ContractAddress}/instance/${serviceNftTokenId}`;
};

export const AgentNft = () => {
  const agentNftSrc = useAgentNft();

  return (
    <Flex justify="center" align="center" gap={8}>
      <NftFilled />
      <a href={agentNftSrc} target="_blank">
        Agent NFT {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Flex>
  );
};
