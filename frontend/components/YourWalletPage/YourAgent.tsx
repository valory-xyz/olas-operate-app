import { Card, Flex, Skeleton, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { Chain } from '@/client';
import { SERVICE_REGISTRY_L2_CONTRACT_ADDRESS } from '@/constants/contractAddresses';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useAddress } from '@/hooks/useAddress';
import { useBalance } from '@/hooks/useBalance';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { AddressLink } from '../AddressLink';
import { InfoBreakdownList } from '../InfoBreakdown';
import { Container, infoBreakdownParentStyle } from './styles';
import {
  OlasTitle,
  OwnershipNftTitle,
  ServiceIdTitle,
  SignerTitle,
  XdaiTitle,
} from './Titles';

const { Text, Paragraph } = Typography;

const NftCard = styled(Card)`
  .ant-card-body {
    padding: 0;
    img {
      border-radius: 8px;
    }
  }
`;

const SafeAddress = () => {
  const { multisigAddress } = useAddress();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: 'Wallet Address',
            leftClassName: 'text-light text-sm',
            right: <AddressLink address={multisigAddress} />,
            rightClassName: 'font-normal text-sm',
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const AgentTitle = () => {
  const { multisigAddress: agentSafeAddress } = useAddress();

  const agentName = useMemo(
    () => (agentSafeAddress ? generateName(agentSafeAddress) : '--'),
    [agentSafeAddress],
  );

  return (
    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Image
          width={36}
          height={36}
          alt="Agent wallet"
          src="/agent-wallet.png"
        />

        <Flex vertical className="w-full">
          <Text className="m-0 text-sm" type="secondary">
            Your agent
          </Text>
          <Flex justify="space-between">
            <Tooltip
              arrow={false}
              title={
                <Paragraph className="text-sm m-0">
                  This is your agent’s unique name
                </Paragraph>
              }
              placement="top"
            >
              <Text strong>{agentName}</Text>
            </Tooltip>

            {/* @note: removed until predict ui resolution */}
            {/* <a
              href={`https://predict.olas.network/agents/${agentSafeAddress}`}
              target="_blank"
              className="text-sm"
            >
              Agent profile {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a> */}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

const ServiceAndNftDetails = () => {
  const { serviceId } = useServices();
  const serviceAddress =
    SERVICE_REGISTRY_L2_CONTRACT_ADDRESS[`${Chain.GNOSIS}`];

  return (
    <NftCard>
      <Flex>
        <Flex>
          <Image width={78} height={78} alt="NFT" src="/NFT.png" />
        </Flex>
        <Flex
          style={{ padding: '16px 12px' }}
          align="center"
          justify="space-between"
          flex={1}
        >
          <Flex vertical>
            <OwnershipNftTitle />
            <a
              href={`https://gnosis.blockscout.com/token/${serviceAddress}/instance/${serviceId}`}
              target="_blank"
            >
              {truncateAddress(serviceAddress)} {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>

          <Flex vertical>
            <ServiceIdTitle />
            <a
              href={`https://registry.olas.network/gnosis/services/${serviceId}`}
              target="_blank"
            >
              {serviceId} {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>
        </Flex>
      </Flex>
    </NftCard>
  );
};

export const YourAgentWallet = () => {
  const { isBalanceLoaded, agentSafeBalance, agentEoaBalance } = useBalance();
  const {
    availableRewardsForEpochEth,
    isEligibleForRewards,
    accruedServiceStakingRewards,
  } = useReward();
  const { instanceAddress: agentEoaAddress } = useAddress();

  const reward = useMemo(() => {
    if (!isBalanceLoaded) return <Skeleton.Input size="small" active />;
    if (!isEligibleForRewards) return 'Not yet earned';
    return `~${balanceFormat(availableRewardsForEpochEth, 2)} OLAS`;
  }, [isBalanceLoaded, isEligibleForRewards, availableRewardsForEpochEth]);

  const olasBalances = useMemo(() => {
    return [
      {
        title: 'Claimed rewards',
        value: `${balanceFormat(agentSafeBalance?.OLAS, 2)} OLAS`,
      },
      {
        title: 'Unclaimed rewards',
        value: `${balanceFormat(accruedServiceStakingRewards, 2)} OLAS`,
      },
      {
        title: 'Current epoch rewards',
        value: reward,
      },
    ];
  }, [agentSafeBalance?.OLAS, accruedServiceStakingRewards, reward]);

  return (
    <Card title={<AgentTitle />}>
      <Container>
        <SafeAddress />

        <Flex vertical gap={8}>
          <OlasTitle />
          <InfoBreakdownList
            list={olasBalances.map((item) => ({
              left: item.title,
              leftClassName: 'text-light text-sm',
              right: item.value,
            }))}
            parentStyle={infoBreakdownParentStyle}
          />
        </Flex>

        <Flex vertical gap={8}>
          <InfoBreakdownList
            list={[
              {
                left: <XdaiTitle />,
                leftClassName: 'text-light text-sm',
                right: `${balanceFormat(agentSafeBalance?.ETH, 2)} XDAI`,
              },
            ]}
            parentStyle={infoBreakdownParentStyle}
          />
        </Flex>

        <Flex vertical gap={8}>
          <InfoBreakdownList
            list={[
              {
                left: (
                  <SignerTitle
                    signerText="Agent's wallet signer address:"
                    signerAddress={agentEoaAddress}
                  />
                ),
                leftClassName: 'text-light text-sm',
                right: `${balanceFormat(agentEoaBalance?.ETH, 2)} XDAI`,
              },
            ]}
            parentStyle={infoBreakdownParentStyle}
          />
        </Flex>

        <ServiceAndNftDetails />
      </Container>
    </Card>
  );
};
