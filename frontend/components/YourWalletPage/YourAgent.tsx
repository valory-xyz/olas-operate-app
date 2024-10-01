import { Card, Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { Chain } from '@/client';
import { AddressLink } from '@/components/AddressLink';
import { SERVICE_REGISTRY_L2_CONTRACT_ADDRESS } from '@/constants/contractAddresses';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useAddress } from '@/hooks/useAddress';
import { useBalance } from '@/hooks/useBalance';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { InfoBreakdownList } from '../InfoBreakdown';
import { Container, infoBreakdownParentStyle } from './styles';
import {
  OlasTitle,
  OwnershipNftTitle,
  ServiceIdTitle,
  SignerTitle,
  XdaiTitle,
} from './Titles';

const { Title } = Typography;

const NftCard = styled(Card)`
  .ant-card-body {
    padding: 0;
    img {
      border-radius: 8px;
    }
  }
`;

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
  const { agentSafeBalance, agentEoaBalance } = useBalance();
  const { accruedServiceStakingRewards } = useReward();
  const {
    instanceAddress: agentEoaAddress,
    multisigAddress: agentSafeAddress,
  } = useAddress();

  const olasBalances = useMemo(() => {
    return [
      {
        title: 'Claimed rewards',
        value: balanceFormat(agentSafeBalance?.OLAS ?? 0, 2),
      },
      {
        title: 'Unclaimed rewards',
        value: balanceFormat(accruedServiceStakingRewards ?? 0, 2),
      },
    ];
  }, [agentSafeBalance?.OLAS, accruedServiceStakingRewards]);

  const agentXdaiBalance = useMemo(
    () => (agentSafeBalance?.ETH ?? 0) + (agentEoaBalance?.ETH ?? 0),
    [agentSafeBalance?.ETH, agentEoaBalance?.ETH],
  );

  return (
    <Card>
      <Container>
        <Flex vertical gap={12}>
          <Image
            width={36}
            height={36}
            alt="Agent wallet"
            src="/agent-wallet.png"
          />

          <Flex justify="space-between" className="w-full">
            <Title level={5} className="m-0 text-base">
              Your agent
            </Title>
            <AddressLink address={agentSafeAddress} />
          </Flex>
        </Flex>

        <Flex vertical gap={8}>
          <OlasTitle />
          <InfoBreakdownList
            list={olasBalances.map((item) => ({
              left: item.title,
              leftClassName: 'text-light text-sm',
              right: `${item.value} OLAS`,
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
                right: `${balanceFormat(agentXdaiBalance, 2)} XDAI`,
              },
            ]}
            parentStyle={infoBreakdownParentStyle}
          />
        </Flex>

        <Flex vertical gap={8}>
          <InfoBreakdownList
            list={[
              {
                left: <SignerTitle />,
                leftClassName: 'text-light text-sm',
                right: <AddressLink address={agentEoaAddress} />,
                rightClassName: 'font-normal',
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
