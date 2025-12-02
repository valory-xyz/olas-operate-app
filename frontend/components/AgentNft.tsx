import { Flex } from 'antd';

import { NftFilled } from '@/components/custom-icons';
import { OLAS_CONTRACTS } from '@/config/olasContracts';
import {
  BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN,
  CONTRACT_TYPE,
  EvmChainId,
  UNICODE_SYMBOLS,
} from '@/constants';
import { useService, useServices } from '@/hooks';
import { asMiddlewareChain } from '@/utils';

const useAgentNft = (configId?: string, chainId?: EvmChainId) => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceNftTokenId } = useService(
    configId ?? selectedService?.service_config_id,
  );

  const evmHomeChainId = chainId ?? selectedAgentConfig?.evmHomeChainId;
  const blockscoutUrl =
    BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(evmHomeChainId)];
  const serviceRegistryL2ContractAddress =
    OLAS_CONTRACTS[evmHomeChainId][CONTRACT_TYPE.ServiceRegistryL2].address;

  return `${blockscoutUrl}/token/${serviceRegistryL2ContractAddress}/instance/${serviceNftTokenId}`;
};

type AgentNftProps = { configId?: string; chainId?: EvmChainId };

export const AgentNft = ({ configId, chainId }: AgentNftProps) => {
  const agentNftSrc = useAgentNft(configId, chainId);

  return (
    <Flex justify="center" align="center" gap={8} className="w-full">
      <NftFilled />
      <a href={agentNftSrc} target="_blank">
        Agent NFT {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Flex>
  );
};
