import { Card, Flex, Skeleton, Tooltip, Typography } from 'antd';
import { isArray, isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { MiddlewareChain } from '@/client';
import { OLAS_CONTRACTS } from '@/config/olasContracts';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { ContractType } from '@/enums/Contract';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useReward } from '@/hooks/useReward';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { generateName } from '@/utils/agentName';
import { balanceFormat } from '@/utils/numberFormatters';
import { truncateAddress } from '@/utils/truncate';

import { AddressLink } from '../AddressLink';
import { InfoBreakdownList } from '../InfoBreakdown';
import { Container, infoBreakdownParentStyle } from './styles';
import { OlasTitle, OwnershipNftTitle, ServiceNftIdTitle } from './Titles';
import { useYourWallet } from './useYourWallet';
import { WithdrawFunds } from './WithdrawFunds';

const { Text, Paragraph } = Typography;

const NftCard = styled(Card)`
  .ant-card-body {
    padding: 0;
    img {
      border-radius: 8px;
    }
  }
`;

const SafeAddress = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();

  return (
    <Flex vertical gap={8}>
      <InfoBreakdownList
        list={[
          {
            left: 'Wallet Address',
            leftClassName: 'text-light text-sm',
            right: (
              <AddressLink
                address={address}
                middlewareChain={middlewareChain}
              />
            ),
            rightClassName: 'font-normal text-sm',
          },
        ]}
        parentStyle={infoBreakdownParentStyle}
      />
    </Flex>
  );
};

const AgentTitle = ({ address }: { address: Address }) => {
  const { middlewareChain } = useYourWallet();

  const agentProfileLink = useMemo(() => {
    if (!address) return null;
    if (middlewareChain === MiddlewareChain.GNOSIS) {
      return `https://predict.olas.network/agents/${address}`;
    }
    return null;
  }, [address, middlewareChain]);

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
                  This is your agent&apos;s unique name
                </Paragraph>
              }
              placement="top"
            >
              <Text strong>{address ? generateName(address) : NA}</Text>
            </Tooltip>

            {agentProfileLink && (
              <a href={agentProfileLink} target="_blank" className="text-sm">
                Agent profile {UNICODE_SYMBOLS.EXTERNAL_LINK}
              </a>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

type ServiceAndNftDetailsProps = { serviceNftTokenId: number };
const ServiceAndNftDetails = ({
  serviceNftTokenId,
}: ServiceAndNftDetailsProps) => {
  const { middlewareChain, evmHomeChainId } = useYourWallet();

  const serviceRegistryL2ContractAddress =
    OLAS_CONTRACTS[evmHomeChainId][ContractType.ServiceRegistryL2].address;

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
              href={`${BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN[middlewareChain]}/token/${serviceRegistryL2ContractAddress}/instance/${serviceNftTokenId}`}
              target="_blank"
            >
              {truncateAddress(serviceRegistryL2ContractAddress as Address)}{' '}
              {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>

          <Flex vertical>
            <ServiceNftIdTitle />
            <a
              href={`https://registry.olas.network/${middlewareChain}/services/${serviceNftTokenId}`}
              target="_blank"
            >
              {serviceNftTokenId} {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          </Flex>
        </Flex>
      </Flex>
    </NftCard>
  );
};

const YourAgentWalletBreakdown = () => {
  const { isLoaded } = useBalanceContext();
  const { selectedService } = useServices();
  const { serviceNftTokenId, serviceEoa } = useService(
    selectedService?.service_config_id,
  );
  const { serviceSafeBalances, serviceEoaBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );
  const { serviceSafe, middlewareChain, evmHomeChainId } = useYourWallet();

  const {
    availableRewardsForEpochEth,
    isEligibleForRewards,
    accruedServiceStakingRewards,
  } = useReward();

  const reward = useMemo(() => {
    if (!isLoaded) return <Skeleton.Input size="small" active />;
    if (isEligibleForRewards) {
      return `~${balanceFormat(availableRewardsForEpochEth, 2)} OLAS`;
    }

    return 'Not yet earned';
  }, [isLoaded, isEligibleForRewards, availableRewardsForEpochEth]);

  const serviceSafeOlas = useMemo(
    () =>
      serviceSafeBalances?.find(
        ({ symbol, evmChainId }) =>
          symbol === TokenSymbol.OLAS && evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  const serviceSafeRewards = useMemo(
    () => [
      {
        title: 'Claimed rewards',
        value: `${balanceFormat(serviceSafeOlas?.balance ?? 0, 2)} OLAS`,
      },
      {
        title: 'Unclaimed rewards',
        value: `${balanceFormat(accruedServiceStakingRewards, 2)} OLAS`,
      },
      {
        title: 'Current epoch rewards',
        value: reward,
      },
    ],
    [accruedServiceStakingRewards, reward, serviceSafeOlas],
  );

  const serviceSafeNativeBalances = useMemo(
    () =>
      serviceSafeBalances?.filter(
        ({ isNative, evmChainId }) => isNative && evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  const serviceSafeErc20Balances = useMemo(
    () =>
      serviceSafeBalances?.filter(
        ({ isNative, symbol, evmChainId }) =>
          !isNative &&
          symbol !== TokenSymbol.OLAS &&
          evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  const serviceEoaNativeBalances = useMemo(
    () =>
      serviceEoaBalances?.filter(
        ({ isNative, evmChainId }) => isNative && evmChainId === evmHomeChainId,
      ),
    [serviceEoaBalances, evmHomeChainId],
  );

  if (!serviceSafe) return null;

  return (
    <Card title={<AgentTitle address={serviceSafe.address} />}>
      <Container>
        <SafeAddress address={serviceSafe.address} />

        {!isEmpty(serviceSafeRewards) && (
          <Flex vertical gap={8}>
            <OlasTitle />
            <InfoBreakdownList
              list={serviceSafeRewards.map((item) => ({
                left: item.title,
                leftClassName: 'text-light text-sm',
                right: item.value,
              }))}
              parentStyle={infoBreakdownParentStyle}
            />
          </Flex>
        )}

        {(!isNil(serviceSafeNativeBalances) ||
          !isNil(serviceEoaNativeBalances)) && (
          <Flex vertical gap={8}>
            {isArray(serviceSafeNativeBalances) && (
              <InfoBreakdownList
                list={serviceSafeNativeBalances.map((balance) => ({
                  left: <strong>{balance.symbol}</strong>,
                  leftClassName: 'text-sm',
                  right: `${balanceFormat(balance.balance, 2)} ${balance.symbol}`,
                }))}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
            {isArray(serviceSafeErc20Balances) && (
              <InfoBreakdownList
                list={serviceSafeErc20Balances.map((balance) => ({
                  left: <strong>{balance.symbol}</strong>,
                  leftClassName: 'text-sm',
                  right: `${balanceFormat(balance.balance, 2)} ${balance.symbol}`,
                }))}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
            {!isNil(serviceEoa) && (
              <InfoBreakdownList
                list={[
                  {
                    left: 'Signer',
                    leftClassName: 'text-sm',
                    right: (
                      <AddressLink
                        address={serviceEoa.address}
                        middlewareChain={middlewareChain}
                      />
                    ),
                    rightClassName: 'font-normal text-sm',
                  },
                ]}
                parentStyle={infoBreakdownParentStyle}
              />
            )}
          </Flex>
        )}

        {!isNil(serviceNftTokenId) && (
          <ServiceAndNftDetails serviceNftTokenId={serviceNftTokenId} />
        )}
      </Container>
    </Card>
  );
};

export const YourAgentWallet = () => {
  const isWithdrawFundsEnabled = useFeatureFlag('withdraw-funds');

  return (
    <>
      <YourAgentWalletBreakdown />
      {isWithdrawFundsEnabled && <WithdrawFunds />}
    </>
  );
};
